const mongoose = require('mongoose');

const attendeeSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    rollNumber: {
      type: String,
      default: '',
      trim: true,
    },
    department: {
      type: String,
      default: '',
      trim: true,
    },
    year: {
      type: String,
      default: '',
      trim: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
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
    category: {
      type: String,
      enum: ['academic', 'club', 'placement', 'admin'],
      required: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    startAt: {
      type: Date,
      required: true,
    },
    endAt: {
      type: Date,
      default: null,
    },
    registrationDeadline: {
      type: Date,
      default: null,
    },
    capacity: {
      type: Number,
      min: 1,
      default: 100,
    },
    status: {
      type: String,
      enum: ['Published', 'Cancelled', 'Completed'],
      default: 'Published',
    },
    targetAudience: {
      type: String,
      enum: ['all', 'students', 'admins'],
      default: 'all',
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
    attendees: {
      type: [attendeeSchema],
      default: [],
    },
    poster: {
      type: new mongoose.Schema(
        {
          url: {
            type: String,
            default: '',
            trim: true,
          },
          publicId: {
            type: String,
            default: '',
            trim: true,
          },
          fileName: {
            type: String,
            default: '',
            trim: true,
          },
          uploadedAt: {
            type: Date,
            default: null,
          },
        },
        { _id: false }
      ),
      default: () => ({
        url: '',
        publicId: '',
        fileName: '',
        uploadedAt: null,
      }),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('Event', eventSchema);
