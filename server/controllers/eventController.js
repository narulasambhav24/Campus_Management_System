const Event = require('../models/Event');
const RegistrationLog = require('../models/RegistrationLog');
const asyncHandler = require('../middleware/asyncHandler');
const createAppError = require('../utils/appError');
const cloudinary = require('../config/cloudinary');
const { SOCKET_EVENTS } = require('../socket');

const VALID_CATEGORIES = ['academic', 'club', 'placement', 'admin'];
const VALID_STATUSES = ['Published', 'Cancelled', 'Completed'];

const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

const uploadPosterToCloudinary = (file, eventId) =>
  new Promise((resolve, reject) => {
    const fileBaseName = String(file.originalname || 'poster')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 50);

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `unihelp/events/${eventId}`,
        resource_type: 'image',
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

const formatEvent = (event, user = null) => {
  const base = event.toObject ? event.toObject() : event;
  const attendees = base.attendees || [];
  const seatsAvailable = Math.max(0, (base.capacity || 0) - attendees.length);
  const userEmail = user?.email ? user.email.toLowerCase() : '';
  const isRegistered = userEmail
    ? attendees.some((attendee) => attendee.email === userEmail)
    : false;

  return {
    ...base,
    attendeeCount: attendees.length,
    seatsAvailable,
    isRegistered,
  };
};

const emitEventUpdate = (req, eventName, eventPayload) => {
  const io = req?.app?.get('io');

  if (!io) {
    return;
  }

  io.to('admins').emit(eventName, eventPayload);

  if (eventPayload.targetAudience === 'all' || eventPayload.targetAudience === 'students') {
    io.to('students').emit(eventName, eventPayload);
  }
};

const getRequestIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    return String(forwardedFor).split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || '';
};

const normalizeRegistrationDetails = (body = {}) => {
  const rollNumber = String(body.rollNumber || '').trim().toUpperCase();
  const department = String(body.department || '').trim();
  const year = String(body.year || '').trim();
  const phone = String(body.phone || '').replace(/[\s-]/g, '').replace(/^\+91/, '');

  return {
    rollNumber,
    department,
    year,
    phone,
  };
};

const validateRegistrationDetails = ({ rollNumber, department, year, phone }) => {
  if (!/^[A-Z0-9/-]{3,30}$/.test(rollNumber)) {
    return 'Roll number must be 3-30 characters and can contain letters, numbers, slash, or hyphen';
  }

  if (department.length < 2 || department.length > 80) {
    return 'Department must be between 2 and 80 characters';
  }

  if (!['1', '2', '3', '4', '5'].includes(year)) {
    return 'Year must be between 1 and 5';
  }

  if (!/^[6-9]\d{9}$/.test(phone)) {
    return 'Phone number must be a valid 10-digit Indian mobile number';
  }

  return '';
};

const writeRegistrationLog = async (req, event, details, status, reason) => {
  await RegistrationLog.create({
    eventId: event?._id ? String(event._id) : String(req.params.id || ''),
    eventTitle: event?.title || '',
    userId: req.user?._id ? String(req.user._id) : '',
    name: req.user?.name || '',
    email: req.user?.email || '',
    ...details,
    status,
    reason,
    ipAddress: getRequestIp(req),
  });
};

const getEvents = asyncHandler(async (req, res) => {
  const { category, search, upcoming, status } = req.query;
  const query = {};

  if (category && VALID_CATEGORIES.includes(category)) {
    query.category = category;
  }

  if (status && VALID_STATUSES.includes(status) && req.user.role === 'admin') {
    query.status = status;
  } else if (req.user.role !== 'admin') {
    query.status = 'Published';
  }

  if (req.user.role !== 'admin') {
    query.$or = [{ targetAudience: 'all' }, { targetAudience: 'students' }];
  }

  if (upcoming === 'true') {
    query.startAt = { $gte: new Date() };
  }

  if (search) {
    query.$and = [
      ...(query.$and || []),
      {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } },
        ],
      },
    ];
  }

  const events = await Event.find(query).sort({ startAt: 1 }).lean();
  res.json(events.map((event) => formatEvent(event, req.user)));
});

const createEvent = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    category,
    location,
    startAt,
    endAt,
    registrationDeadline,
    capacity,
    targetAudience,
  } = req.body;

  if (!title || !description || !category || !location || !startAt) {
    throw createAppError('title, description, category, location, and startAt are required', 400);
  }

  if (!VALID_CATEGORIES.includes(category)) {
    throw createAppError(`category must be one of: ${VALID_CATEGORIES.join(', ')}`, 400);
  }

  const parsedStartAt = new Date(startAt);
  if (Number.isNaN(parsedStartAt.getTime())) {
    throw createAppError('startAt must be a valid date-time', 400);
  }

  const parsedEndAt = endAt ? new Date(endAt) : null;
  if (parsedEndAt && Number.isNaN(parsedEndAt.getTime())) {
    throw createAppError('endAt must be a valid date-time', 400);
  }

  const parsedRegistrationDeadline = registrationDeadline ? new Date(registrationDeadline) : null;
  if (parsedRegistrationDeadline && Number.isNaN(parsedRegistrationDeadline.getTime())) {
    throw createAppError('registrationDeadline must be a valid date-time', 400);
  }

  const createdEvent = await Event.create({
    title: title.trim(),
    description: description.trim(),
    category,
    location: location.trim(),
    startAt: parsedStartAt,
    endAt: parsedEndAt,
    registrationDeadline: parsedRegistrationDeadline,
    capacity: Number.isFinite(Number(capacity)) ? Number(capacity) : 100,
    targetAudience: ['all', 'students', 'admins'].includes(targetAudience) ? targetAudience : 'all',
    createdBy: String(req.user._id),
    createdByName: req.user.name,
    attendees: [],
    poster: {
      url: '',
      publicId: '',
      fileName: '',
      uploadedAt: null,
    },
  });

  const eventPayload = formatEvent(createdEvent, req.user);
  emitEventUpdate(req, SOCKET_EVENTS.EVENT_CREATED, eventPayload);

  res.status(201).json({
    success: true,
    event: eventPayload,
    message: 'Event created successfully',
  });
});

const updateEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const event = await Event.findById(id);

  if (!event) {
    throw createAppError('Event not found', 404);
  }

  const allowedFields = [
    'title',
    'description',
    'category',
    'location',
    'startAt',
    'endAt',
    'registrationDeadline',
    'capacity',
    'targetAudience',
    'status',
  ];

  allowedFields.forEach((field) => {
    if (!(field in req.body)) {
      return;
    }

    if (field === 'status' && !VALID_STATUSES.includes(req.body.status)) {
      throw createAppError(`status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
    }

    if (field === 'category' && !VALID_CATEGORIES.includes(req.body.category)) {
      throw createAppError(`category must be one of: ${VALID_CATEGORIES.join(', ')}`, 400);
    }

    if (['startAt', 'endAt', 'registrationDeadline'].includes(field) && req.body[field]) {
      const parsedDate = new Date(req.body[field]);
      if (Number.isNaN(parsedDate.getTime())) {
        throw createAppError(`${field} must be a valid date-time`, 400);
      }
      event[field] = parsedDate;
      return;
    }

    event[field] = req.body[field];
  });

  if (Number(event.capacity) < (event.attendees || []).length) {
    throw createAppError('capacity cannot be lower than current registration count', 400);
  }

  await event.save();

  const eventPayload = formatEvent(event, req.user);
  emitEventUpdate(req, SOCKET_EVENTS.EVENT_UPDATED, eventPayload);

  res.json({
    success: true,
    event: eventPayload,
    message: 'Event updated successfully',
  });
});

const registerForEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const registrationDetails = normalizeRegistrationDetails(req.body);
  const event = await Event.findById(id);

  if (!event) {
    await writeRegistrationLog(req, null, registrationDetails, 'failure', 'Event not found');
    throw createAppError('Event not found', 404);
  }

  const validationError = validateRegistrationDetails(registrationDetails);
  if (validationError) {
    await writeRegistrationLog(req, event, registrationDetails, 'failure', validationError);
    throw createAppError(validationError, 400);
  }

  if (event.status !== 'Published') {
    await writeRegistrationLog(
      req,
      event,
      registrationDetails,
      'failure',
      'Only published events are open for registration'
    );
    throw createAppError('Only published events are open for registration', 400);
  }

  if (event.registrationDeadline && new Date() > event.registrationDeadline) {
    await writeRegistrationLog(req, event, registrationDetails, 'failure', 'Registration deadline has passed');
    throw createAppError('Registration deadline has passed', 400);
  }

  const currentAttendees = event.attendees || [];
  const userEmail = req.user.email.toLowerCase();

  if (currentAttendees.some((attendee) => attendee.email === userEmail)) {
    await writeRegistrationLog(req, event, registrationDetails, 'failure', 'You are already registered for this event');
    throw createAppError('You are already registered for this event', 409);
  }

  if (currentAttendees.length >= event.capacity) {
    await writeRegistrationLog(req, event, registrationDetails, 'failure', 'Event capacity has been reached');
    throw createAppError('Event capacity has been reached', 409);
  }

  event.attendees.push({
    userId: String(req.user._id),
    name: req.user.name,
    email: userEmail,
    ...registrationDetails,
    registeredAt: new Date(),
  });

  await event.save();
  await writeRegistrationLog(req, event, registrationDetails, 'success', 'Registration successful');

  const eventPayload = formatEvent(event, req.user);
  emitEventUpdate(req, SOCKET_EVENTS.EVENT_UPDATED, eventPayload);

  res.status(201).json({
    success: true,
    event: eventPayload,
    message: 'Registration successful',
  });
});

const exportAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const event = await Event.findById(id).lean();

  if (!event) {
    throw createAppError('Event not found', 404);
  }

  const header = ['Name', 'Email', 'Roll Number', 'Department', 'Year', 'Phone', 'Registered At'];
  const rows = (event.attendees || []).map((attendee) => [
    attendee.name,
    attendee.email,
    attendee.rollNumber,
    attendee.department,
    attendee.year,
    attendee.phone,
    attendee.registeredAt ? new Date(attendee.registeredAt).toISOString() : '',
  ]);

  const csv = [header, ...rows]
    .map((row) =>
      row
        .map((value) => `"${String(value || '').replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');

  const safeTitle = String(event.title || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}-attendance.csv"`);
  res.send(csv);
});

const getRegistrationLogs = asyncHandler(async (req, res) => {
  const { eventId, status } = req.query;
  const query = {};

  if (eventId) {
    query.eventId = String(eventId);
  }

  if (['success', 'failure'].includes(status)) {
    query.status = status;
  }

  const logs = await RegistrationLog.find(query).sort({ createdAt: -1 }).limit(200).lean();
  res.json(logs);
});

const uploadEventPoster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const file = req.file;

  if (!id) {
    throw createAppError('Event ID is required', 400);
  }

  if (!file) {
    throw createAppError('Poster image is required', 400);
  }

  if (!isCloudinaryConfigured()) {
    throw createAppError(
      'Poster upload is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.',
      500
    );
  }

  const event = await Event.findById(id);
  if (!event) {
    throw createAppError('Event not found', 404);
  }

  if (event.poster?.publicId) {
    try {
      await cloudinary.uploader.destroy(event.poster.publicId, { resource_type: 'image' });
    } catch (error) {
      // Non-blocking cleanup attempt.
    }
  }

  const uploadResult = await uploadPosterToCloudinary(file, event._id);
  event.poster = {
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    fileName: file.originalname,
    uploadedAt: new Date(),
  };

  await event.save();

  const eventPayload = formatEvent(event, req.user);
  emitEventUpdate(req, SOCKET_EVENTS.EVENT_UPDATED, eventPayload);

  res.status(201).json({
    success: true,
    event: eventPayload,
    message: 'Event poster uploaded successfully',
  });
});

const deleteEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const event = await Event.findById(id);

  if (!event) {
    throw createAppError('Event not found', 404);
  }

  const eventPayload = formatEvent(event, req.user);

  if (event.poster?.publicId && isCloudinaryConfigured()) {
    try {
      await cloudinary.uploader.destroy(event.poster.publicId, { resource_type: 'image' });
    } catch (error) {
      // Cleanup failure should not block deleting the event record.
    }
  }

  await event.deleteOne();
  emitEventUpdate(req, SOCKET_EVENTS.EVENT_DELETED, eventPayload);

  res.json({
    success: true,
    message: 'Event deleted successfully',
  });
});

module.exports = {
  getEvents,
  createEvent,
  updateEvent,
  registerForEvent,
  exportAttendance,
  getRegistrationLogs,
  uploadEventPoster,
  deleteEvent,
};
