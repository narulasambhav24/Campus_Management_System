const mongoose = require('mongoose');

const versionHistorySchema = new mongoose.Schema(
  {
    version: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    summary: {
      type: String,
      default: '',
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    effectiveDate: {
      type: Date,
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    changedBy: {
      type: String,
      default: '',
      trim: true,
    },
    changedByName: {
      type: String,
      default: '',
      trim: true,
    },
    changeNote: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const policySchema = new mongoose.Schema(
  {
    policyCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['Hostel', 'Exam', 'Fees', 'Grievance', 'General'],
      required: true,
    },
    summary: {
      type: String,
      default: '',
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    effectiveDate: {
      type: Date,
      required: true,
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: String,
      required: true,
      trim: true,
    },
    createdByName: {
      type: String,
      required: true,
      trim: true,
    },
    updatedBy: {
      type: String,
      default: '',
      trim: true,
    },
    updatedByName: {
      type: String,
      default: '',
      trim: true,
    },
    versionHistory: {
      type: [versionHistorySchema],
      default: [],
    },
    circulars: {
      type: [
        new mongoose.Schema(
          {
            title: {
              type: String,
              default: '',
              trim: true,
            },
            url: {
              type: String,
              required: true,
              trim: true,
            },
            publicId: {
              type: String,
              required: true,
              trim: true,
            },
            fileName: {
              type: String,
              required: true,
              trim: true,
            },
            fileType: {
              type: String,
              required: true,
              trim: true,
            },
            uploadedBy: {
              type: String,
              default: '',
              trim: true,
            },
            uploadedByName: {
              type: String,
              default: '',
              trim: true,
            },
            uploadedAt: {
              type: Date,
              default: Date.now,
            },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('Policy', policySchema);
