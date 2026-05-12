const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    studentId: {
      type: String,
      required: true,
      trim: true,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['IT', 'Hostel', 'Academic', 'Administration'],
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['Pending', 'In Progress', 'Resolved'],
      default: 'Pending',
    },
    priority: {
      type: String,
      required: true,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    assignedTo: {
      type: String,
      default: '',
      trim: true,
    },
    assignedToName: {
      type: String,
      default: '',
      trim: true,
    },
    attachments: {
      type: [
        new mongoose.Schema(
          {
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
            createdAt: {
              type: Date,
              default: Date.now,
            },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    history: {
      type: [
        new mongoose.Schema(
          {
            type: {
              type: String,
              required: true,
              trim: true,
            },
            message: {
              type: String,
              required: true,
              trim: true,
            },
            actorId: {
              type: String,
              default: '',
              trim: true,
            },
            actorName: {
              type: String,
              default: '',
              trim: true,
            },
            actorRole: {
              type: String,
              default: '',
              trim: true,
            },
            createdAt: {
              type: Date,
              default: Date.now,
            },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    dueAt: {
      type: Date,
      default: null,
    },
    slaBreachedAt: {
      type: Date,
      default: null,
    },
    escalated: {
      type: Boolean,
      default: false,
    },
    escalationLevel: {
      type: Number,
      default: 0,
      min: 0,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model('Request', requestSchema);
