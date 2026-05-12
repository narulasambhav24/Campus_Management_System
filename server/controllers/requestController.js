const Request = require('../models/Request');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const createAppError = require('../utils/appError');
const { SOCKET_EVENTS } = require('../socket');
const cloudinary = require('../config/cloudinary');

const VALID_STATUSES = ['Pending', 'In Progress', 'Resolved'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High'];

const CATEGORY_SLA_HOURS = {
  IT: 48,
  Hostel: 72,
  Academic: 120,
  Administration: 96,
};

const calculateDueAt = (createdAt, category) => {
  const baseDate = createdAt ? new Date(createdAt) : new Date();
  const slaHours = CATEGORY_SLA_HOURS[category] || 96;
  return new Date(baseDate.getTime() + slaHours * 60 * 60 * 1000);
};

const formatRequest = (request) => {
  const raw = {
    priority: 'Medium',
    assignedTo: '',
    assignedToName: '',
    attachments: [],
    history: [],
    dueAt: null,
    slaBreachedAt: null,
    escalated: false,
    escalationLevel: 0,
    resolvedAt: null,
    ...request,
  };

  const dueAtDate = raw.dueAt ? new Date(raw.dueAt) : null;
  const isResolved = raw.status === 'Resolved';
  const isBreached = Boolean(dueAtDate && !isResolved && Date.now() > dueAtDate.getTime());
  const remainingMs = dueAtDate ? dueAtDate.getTime() - Date.now() : null;

  return {
    ...raw,
    sla: {
      dueAt: raw.dueAt || null,
      breachedAt: raw.slaBreachedAt || null,
      isBreached,
      remainingHours: remainingMs === null ? null : Number((remainingMs / (1000 * 60 * 60)).toFixed(2)),
    },
  };
};

const uploadToCloudinary = (file, requestId) =>
  new Promise((resolve, reject) => {
    const resourceType = file.mimetype === 'application/pdf' ? 'raw' : 'image';
    const fileBaseName = String(file.originalname || 'attachment')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 50);

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `unihelp/requests/${requestId}`,
        resource_type: resourceType,
        public_id: `${Date.now()}-${fileBaseName}`,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    uploadStream.end(file.buffer);
  });

const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

const buildHistoryEntry = (type, message, user) => ({
  type,
  message,
  actorId: user?._id ? String(user._id) : '',
  actorName: user?.name || '',
  actorRole: user?.role || '',
  createdAt: new Date(),
});

const generateRequestId = async () => {
  const requests = await Request.find({}, { id: 1, _id: 0 }).lean();
  const highestId = requests.reduce((max, request) => {
    const numericPart = Number.parseInt(String(request.id || '').replace('REQ-', ''), 10);
    return Number.isNaN(numericPart) ? max : Math.max(max, numericPart);
  }, 0);

  return `REQ-${String(highestId + 1).padStart(3, '0')}`;
};

const buildCategoryBreakdown = (requests) => {
  const categories = ['IT', 'Hostel', 'Academic', 'Administration'];
  return categories.map((category) => ({
    category,
    count: requests.filter((request) => request.category === category).length,
  }));
};

const buildPriorityBreakdown = (requests) =>
  VALID_PRIORITIES.map((priority) => ({
    priority,
    count: requests.filter((request) => (request.priority || 'Medium') === priority).length,
  }));

const buildRecentActivity = (requests) =>
  requests
    .flatMap((request) =>
      (request.history || []).map((entry) => ({
        requestId: request.id,
        title: request.title,
        type: entry.type,
        message: entry.message,
        actorName: entry.actorName,
        createdAt: entry.createdAt,
      }))
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

const emitRequestEvent = (req, eventName, request) => {
  const io = req?.app?.get('io');

  if (!io) {
    return;
  }

  io.to('admins').emit(eventName, request);
  io.to(`user:${request.studentId}`).emit(eventName, request);

  if (request.assignedTo) {
    io.to(`user-id:${request.assignedTo}`).emit(eventName, request);
  }

  io.to('admins').emit(SOCKET_EVENTS.DASHBOARD_REFRESH, { role: 'admin' });
  io.to(`user:${request.studentId}`).emit(SOCKET_EVENTS.DASHBOARD_REFRESH, { role: 'student' });
};

const backfillMissingDueDates = async () => {
  const requests = await Request.find({
    $or: [{ dueAt: null }, { dueAt: { $exists: false } }],
  });

  if (requests.length === 0) {
    return;
  }

  await Promise.all(
    requests.map(async (request) => {
      request.dueAt = calculateDueAt(request.createdAt, request.category);
      if (request.status !== 'Resolved' && request.dueAt && new Date() > request.dueAt && !request.slaBreachedAt) {
        request.slaBreachedAt = new Date();
      }
      await request.save();
    })
  );
};

const processEscalationSweep = async (req) => {
  await backfillMissingDueDates();

  const overdueRequests = await Request.find({
    status: { $ne: 'Resolved' },
    dueAt: { $lte: new Date() },
    escalationLevel: { $lt: 1 },
  });

  if (overdueRequests.length === 0) {
    return [];
  }

  const fallbackAdmin = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 });
  const updatedRequests = [];

  for (const request of overdueRequests) {
    const historyEntries = [];

    if (!request.slaBreachedAt) {
      request.slaBreachedAt = new Date();
    }

    if (!request.assignedTo && fallbackAdmin) {
      request.assignedTo = String(fallbackAdmin._id);
      request.assignedToName = fallbackAdmin.name;
      historyEntries.push(
        buildHistoryEntry(
          'assignment',
          `Auto-assigned to ${fallbackAdmin.name} due to SLA breach`,
          req?.user || null
        )
      );
    }

    request.escalated = true;
    request.escalationLevel = 1;
    historyEntries.push(
      buildHistoryEntry(
        'escalation',
        'SLA breached. Request escalated for priority handling.',
        req?.user || null
      )
    );

    request.history = [...(request.history || []), ...historyEntries];
    request.updatedAt = new Date();
    await request.save();

    const formatted = formatRequest(request.toObject());
    updatedRequests.push(formatted);
    emitRequestEvent(req, SOCKET_EVENTS.REQUEST_UPDATED, formatted);
  }

  return updatedRequests;
};

const getAllRequests = asyncHandler(async (req, res) => {
  await processEscalationSweep(req);
  const requests = await Request.find().sort({ createdAt: -1 }).lean();
  res.json(requests.map(formatRequest));
});

const getAdminDashboard = asyncHandler(async (req, res) => {
  await processEscalationSweep(req);
  const requests = (await Request.find().sort({ createdAt: -1 }).lean()).map(formatRequest);

  const stats = {
    total: requests.length,
    pending: requests.filter((request) => request.status === 'Pending').length,
    inProgress: requests.filter((request) => request.status === 'In Progress').length,
    resolved: requests.filter((request) => request.status === 'Resolved').length,
    unassigned: requests.filter((request) => !request.assignedTo).length,
    highPriority: requests.filter((request) => request.priority === 'High').length,
    overdue: requests.filter((request) => request.sla?.isBreached).length,
    escalated: requests.filter((request) => request.escalated).length,
  };

  res.json({
    stats,
    allRequests: requests,
    categoryBreakdown: buildCategoryBreakdown(requests),
    priorityBreakdown: buildPriorityBreakdown(requests),
    recentRequests: requests.slice(0, 5),
    recentActivity: buildRecentActivity(requests),
  });
});

const getStudentDashboard = asyncHandler(async (req, res) => {
  await processEscalationSweep(req);
  const requests = (await Request.find({ studentId: req.user.email }).sort({ createdAt: -1 }).lean()).map(formatRequest);

  const stats = {
    total: requests.length,
    pending: requests.filter((request) => request.status === 'Pending').length,
    inProgress: requests.filter((request) => request.status === 'In Progress').length,
    resolved: requests.filter((request) => request.status === 'Resolved').length,
    assigned: requests.filter((request) => Boolean(request.assignedToName)).length,
    highPriority: requests.filter((request) => request.priority === 'High').length,
    overdue: requests.filter((request) => request.sla?.isBreached).length,
  };

  res.json({
    stats,
    categoryBreakdown: buildCategoryBreakdown(requests),
    priorityBreakdown: buildPriorityBreakdown(requests),
    recentRequests: requests.slice(0, 4),
    recentActivity: buildRecentActivity(requests),
  });
});

const getUserRequests = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  if (!studentId) {
    throw createAppError('Student ID is required', 400);
  }

  if (req.user.role !== 'admin' && req.user.email !== studentId) {
    throw createAppError('You are not authorized to view these requests', 403);
  }

  await processEscalationSweep(req);
  const requests = await Request.find({ studentId }).sort({ createdAt: -1 }).lean();
  res.json(requests.map(formatRequest));
});

const getRequestById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw createAppError('Request ID is required', 400);
  }

  await processEscalationSweep(req);
  const request = await Request.findOne({ id }).lean();

  if (!request) {
    throw createAppError('Request not found', 404);
  }

  if (req.user.role !== 'admin' && req.user.email !== request.studentId) {
    throw createAppError('You are not authorized to view this request', 403);
  }

  res.json(formatRequest(request));
});

const createRequest = asyncHandler(async (req, res) => {
  const { studentId, studentName, category, title, description, priority } = req.body;

  if (!studentId || !studentName || !category || !title || !description) {
    throw createAppError('All fields (studentId, studentName, category, title, description) are required', 400);
  }

  if (req.user.role !== 'admin' && req.user.email !== studentId) {
    throw createAppError('You are not authorized to create a request for this user', 403);
  }

  const effectiveStudentId = req.user.role === 'admin' ? studentId.trim() : req.user.email;
  const effectiveStudentName = req.user.role === 'admin' ? studentName.trim() : req.user.name;
  const now = new Date();

  const request = await Request.create({
    id: await generateRequestId(),
    studentId: effectiveStudentId,
    studentName: effectiveStudentName,
    category,
    title: title.trim(),
    description: description.trim(),
    status: 'Pending',
    priority: req.user.role === 'admin' && VALID_PRIORITIES.includes(priority) ? priority : 'Medium',
    assignedTo: '',
    assignedToName: '',
    attachments: [],
    history: [
      buildHistoryEntry(
        'created',
        `Request created by ${effectiveStudentName}`,
        req.user
      ),
    ],
    dueAt: calculateDueAt(now, category),
    slaBreachedAt: null,
    escalated: false,
    escalationLevel: 0,
    resolvedAt: null,
    createdAt: now,
    updatedAt: null,
  });

  const formattedRequest = formatRequest(request.toObject());

  res.status(201).json({
    success: true,
    request: formattedRequest,
    message: 'Request created successfully',
  });

  emitRequestEvent(req, SOCKET_EVENTS.REQUEST_CREATED, formattedRequest);
});

const addAttachments = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const files = req.files || [];

  if (!id) {
    throw createAppError('Request ID is required', 400);
  }

  if (!files.length) {
    throw createAppError('At least one attachment is required', 400);
  }

  if (!isCloudinaryConfigured()) {
    throw createAppError(
      'Attachment upload is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.',
      500
    );
  }

  const request = await Request.findOne({ id });

  if (!request) {
    throw createAppError('Request not found', 404);
  }

  if (req.user.role !== 'admin' && req.user.email !== request.studentId) {
    throw createAppError('You are not authorized to upload attachments for this request', 403);
  }

  const uploadResults = await Promise.all(
    files.map(async (file) => {
      const result = await uploadToCloudinary(file, request.id);
      return {
        url: result.secure_url,
        publicId: result.public_id,
        fileName: file.originalname,
        fileType: file.mimetype,
        uploadedBy: req.user.email || req.user.name || '',
        createdAt: new Date(),
      };
    })
  );

  request.attachments = [...(request.attachments || []), ...uploadResults];
  request.history = [
    ...(request.history || []),
    buildHistoryEntry('attachment', `${uploadResults.length} attachment(s) uploaded`, req.user),
  ];
  request.updatedAt = new Date();
  await request.save();

  const formattedRequest = formatRequest(request.toObject());

  res.status(201).json({
    success: true,
    request: formattedRequest,
    message: 'Attachments uploaded successfully',
  });

  emitRequestEvent(req, SOCKET_EVENTS.REQUEST_UPDATED, formattedRequest);
});

const updateRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, priority, assignedTo, note } = req.body;

  if (!id) {
    throw createAppError('Request ID is required', 400);
  }

  if (status && !VALID_STATUSES.includes(status)) {
    throw createAppError(`Status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
  }

  if (priority && !VALID_PRIORITIES.includes(priority)) {
    throw createAppError(`Priority must be one of: ${VALID_PRIORITIES.join(', ')}`, 400);
  }

  const request = await Request.findOne({ id });

  if (!request) {
    throw createAppError('Request not found', 404);
  }

  const historyEntries = [];

  if (status && status !== request.status) {
    historyEntries.push(
      buildHistoryEntry('status', `Status changed from ${request.status} to ${status}`, req.user)
    );
    request.status = status;

    if (status === 'Resolved') {
      request.resolvedAt = new Date();
    } else {
      request.resolvedAt = null;
      if (request.dueAt && new Date() > new Date(request.dueAt) && !request.slaBreachedAt) {
        request.slaBreachedAt = new Date();
      }
    }
  }

  if (priority && priority !== request.priority) {
    historyEntries.push(
      buildHistoryEntry('priority', `Priority changed from ${request.priority || 'Medium'} to ${priority}`, req.user)
    );
    request.priority = priority;
  }

  if (typeof assignedTo === 'string') {
    const normalizedAssignedTo = assignedTo.trim();

    if (normalizedAssignedTo !== (request.assignedTo || '')) {
      let assignedUser = null;

      if (normalizedAssignedTo) {
        assignedUser = await User.findById(normalizedAssignedTo);
        if (!assignedUser) {
          throw createAppError('Assigned admin not found', 404);
        }
        if (assignedUser.role !== 'admin') {
          throw createAppError('Requests can only be assigned to admin users', 400);
        }
      }

      const previousAssignee = request.assignedToName || 'Unassigned';
      const nextAssignee = assignedUser ? assignedUser.name : 'Unassigned';
      historyEntries.push(
        buildHistoryEntry('assignment', `Assignment changed from ${previousAssignee} to ${nextAssignee}`, req.user)
      );
      request.assignedTo = assignedUser ? String(assignedUser._id) : '';
      request.assignedToName = assignedUser ? assignedUser.name : '';
    }
  }

  if (note && note.trim()) {
    historyEntries.push(
      buildHistoryEntry('note', note.trim(), req.user)
    );
  }

  if (historyEntries.length === 0) {
    throw createAppError('No valid request updates were provided', 400);
  }

  request.history = [...(request.history || []), ...historyEntries];
  request.updatedAt = new Date();
  await request.save();

  const formattedRequest = formatRequest(request.toObject());

  res.json({
    success: true,
    request: formattedRequest,
    message: 'Request updated successfully',
  });

  emitRequestEvent(req, SOCKET_EVENTS.REQUEST_UPDATED, formattedRequest);
});

const runEscalationSweep = asyncHandler(async (req, res) => {
  const updatedRequests = await processEscalationSweep(req);

  res.json({
    success: true,
    escalatedCount: updatedRequests.length,
    requests: updatedRequests,
    message:
      updatedRequests.length > 0
        ? `${updatedRequests.length} overdue request(s) escalated`
        : 'No overdue requests to escalate',
  });
});

module.exports = {
  getAllRequests,
  getAdminDashboard,
  getUserRequests,
  getRequestById,
  getStudentDashboard,
  createRequest,
  addAttachments,
  updateRequest,
  runEscalationSweep,
};
