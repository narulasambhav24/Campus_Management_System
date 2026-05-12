const Policy = require('../models/Policy');
const asyncHandler = require('../middleware/asyncHandler');
const createAppError = require('../utils/appError');
const cloudinary = require('../config/cloudinary');

const VALID_CATEGORIES = ['Hostel', 'Exam', 'Fees', 'Grievance', 'General'];
const CAMPUS_TIMEZONE = process.env.CAMPUS_TIMEZONE || 'Asia/Kolkata';

const normalizeTags = (tags) => {
  if (!tags) {
    return [];
  }

  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }

  return String(tags)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
};

const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

const uploadCircularToCloudinary = (file, policyCode) =>
  new Promise((resolve, reject) => {
    const resourceType = file.mimetype === 'application/pdf' ? 'raw' : 'image';
    const fileBaseName = String(file.originalname || 'circular')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 50);

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `unihelp/policies/${policyCode}`,
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

const toCampusDateKey = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('en-CA', { timeZone: CAMPUS_TIMEZONE });
};

const getPolicies = asyncHandler(async (req, res) => {
  const { category, search, activeOnly } = req.query;
  const query = {};
  const shouldApplyStudentVisibility = req.user.role !== 'admin' || activeOnly === 'true';

  if (category && VALID_CATEGORIES.includes(category)) {
    query.category = category;
  }

  if (shouldApplyStudentVisibility) {
    query.isActive = true;
  }

  if (search) {
    query.$or = [
      { policyCode: { $regex: search, $options: 'i' } },
      { title: { $regex: search, $options: 'i' } },
      { summary: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } },
    ];
  }

  let policies = await Policy.find(query).sort({ category: 1, policyCode: 1 }).lean();

  if (shouldApplyStudentVisibility) {
    const todayKey = toCampusDateKey(new Date());
    policies = policies.filter((policy) => {
      const policyDateKey = toCampusDateKey(policy.effectiveDate);
      return policyDateKey && policyDateKey <= todayKey;
    });
  }

  res.json(policies);
});

const getPolicyById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const policy = await Policy.findById(id).lean();

  if (!policy) {
    throw createAppError('Policy not found', 404);
  }

  if (req.user.role !== 'admin') {
    const isEffective = toCampusDateKey(policy.effectiveDate) <= toCampusDateKey(new Date());
    if (!policy.isActive || !isEffective) {
      throw createAppError('Policy not found', 404);
    }
  }

  res.json(policy);
});

const createPolicy = asyncHandler(async (req, res) => {
  const {
    policyCode,
    title,
    category,
    summary,
    content,
    tags,
    effectiveDate,
    isActive,
  } = req.body;

  if (!policyCode || !title || !category || !content || !effectiveDate) {
    throw createAppError('policyCode, title, category, content, and effectiveDate are required', 400);
  }

  if (!VALID_CATEGORIES.includes(category)) {
    throw createAppError(`category must be one of: ${VALID_CATEGORIES.join(', ')}`, 400);
  }

  const parsedDate = new Date(effectiveDate);
  if (Number.isNaN(parsedDate.getTime())) {
    throw createAppError('effectiveDate must be a valid date', 400);
  }

  const code = String(policyCode).trim().toUpperCase();
  const existingPolicy = await Policy.findOne({ policyCode: code });
  if (existingPolicy) {
    throw createAppError('Policy code already exists', 409);
  }

  const policy = await Policy.create({
    policyCode: code,
    title: String(title).trim(),
    category,
    summary: String(summary || '').trim(),
    content: String(content).trim(),
    tags: normalizeTags(tags),
    effectiveDate: parsedDate,
    isActive: typeof isActive === 'boolean' ? isActive : true,
    createdBy: String(req.user._id),
    createdByName: req.user.name,
    updatedBy: String(req.user._id),
    updatedByName: req.user.name,
    version: 1,
  });

  res.status(201).json({
    success: true,
    policy: policy.toObject(),
    message: 'Policy published successfully',
  });
});

const updatePolicy = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    title,
    category,
    summary,
    content,
    tags,
    effectiveDate,
    isActive,
    changeNote,
  } = req.body;

  const policy = await Policy.findById(id);
  if (!policy) {
    throw createAppError('Policy not found', 404);
  }

  if (category && !VALID_CATEGORIES.includes(category)) {
    throw createAppError(`category must be one of: ${VALID_CATEGORIES.join(', ')}`, 400);
  }

  const parsedEffectiveDate = effectiveDate ? new Date(effectiveDate) : null;
  if (parsedEffectiveDate && Number.isNaN(parsedEffectiveDate.getTime())) {
    throw createAppError('effectiveDate must be a valid date', 400);
  }

  const hasVersionedChange = Boolean(
    title || category || summary !== undefined || content || tags || effectiveDate
  );

  if (hasVersionedChange) {
    policy.versionHistory = [
      ...(policy.versionHistory || []),
      {
        version: policy.version,
        title: policy.title,
        summary: policy.summary,
        content: policy.content,
        tags: policy.tags,
        effectiveDate: policy.effectiveDate,
        changedBy: String(req.user._id),
        changedByName: req.user.name,
        changeNote: String(changeNote || '').trim(),
        changedAt: new Date(),
      },
    ];
    policy.version += 1;
  }

  if (title) {
    policy.title = String(title).trim();
  }
  if (category) {
    policy.category = category;
  }
  if (summary !== undefined) {
    policy.summary = String(summary).trim();
  }
  if (content) {
    policy.content = String(content).trim();
  }
  if (tags) {
    policy.tags = normalizeTags(tags);
  }
  if (parsedEffectiveDate) {
    policy.effectiveDate = parsedEffectiveDate;
  }
  if (typeof isActive === 'boolean') {
    policy.isActive = isActive;
  }

  policy.updatedBy = String(req.user._id);
  policy.updatedByName = req.user.name;
  await policy.save();

  res.json({
    success: true,
    policy: policy.toObject(),
    message: 'Policy updated successfully',
  });
});

const uploadPolicyCircular = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  const file = req.file;

  if (!id) {
    throw createAppError('Policy ID is required', 400);
  }

  if (!file) {
    throw createAppError('Circular file is required', 400);
  }

  if (!isCloudinaryConfigured()) {
    throw createAppError(
      'Circular upload is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.',
      500
    );
  }

  const policy = await Policy.findById(id);
  if (!policy) {
    throw createAppError('Policy not found', 404);
  }

  const uploadResult = await uploadCircularToCloudinary(file, policy.policyCode);

  policy.circulars = [
    ...(policy.circulars || []),
    {
      title: String(title || '').trim(),
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      fileName: file.originalname,
      fileType: file.mimetype,
      uploadedBy: String(req.user._id),
      uploadedByName: req.user.name,
      uploadedAt: new Date(),
    },
  ];

  policy.updatedBy = String(req.user._id);
  policy.updatedByName = req.user.name;
  await policy.save();

  res.status(201).json({
    success: true,
    policy: policy.toObject(),
    message: 'Circular uploaded successfully',
  });
});

module.exports = {
  getPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  uploadPolicyCircular,
};
