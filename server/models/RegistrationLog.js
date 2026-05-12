const mongoose = require('mongoose');

const registrationLogSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      trim: true,
    },
    eventTitle: {
      type: String,
      default: '',
      trim: true,
    },
    userId: {
      type: String,
      default: '',
      trim: true,
    },
    name: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
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
    status: {
      type: String,
      enum: ['success', 'failure'],
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    ipAddress: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

registrationLogSchema.index({ eventId: 1, createdAt: -1 });
registrationLogSchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.model('RegistrationLog', registrationLogSchema);
