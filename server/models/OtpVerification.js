const mongoose = require('mongoose');

const otpVerificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // May be null if signup verification before user creation, or user id if existing
    },
    email: {
      type: String,
      required: [true, 'Email is required for OTP verification'],
      lowercase: true,
      trim: true,
      index: true,
    },
    purpose: {
      type: String,
      required: [true, 'Purpose is required'],
      enum: ['LOGIN', 'SIGNUP'],
      default: 'LOGIN',
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index: MongoDB will remove document once expiresAt is reached
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    resendAvailableAt: {
      type: Date,
      required: true,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
    // For signup, temporary payload can be securely stored or user created pending verification
    signupData: {
      type: Object,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying active OTP by email and purpose
otpVerificationSchema.index({ email: 1, purpose: 1, consumedAt: 1 });

module.exports = mongoose.model('OtpVerification', otpVerificationSchema);
