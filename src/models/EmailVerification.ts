import mongoose, { Document, Model, Schema } from 'mongoose';

// Email verification interface
export interface IEmailVerification {
  email: string;
  otpCode: string;
  expiresAt: Date;
  isUsed: boolean;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  updatedAt: Date;
}

// Email verification document interface
export interface IEmailVerificationDocument extends IEmailVerification, Document {}

// Email verification model interface
export interface IEmailVerificationModel extends Model<IEmailVerificationDocument> {
  createOTP(email: string): Promise<IEmailVerificationDocument>;
  verifyOTP(email: string, otpCode: string): Promise<{ isValid: boolean; message: string }>;
  cleanupExpired(): Promise<void>;
}

// Email verification schema
const emailVerificationSchema = new Schema<IEmailVerificationDocument, IEmailVerificationModel>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    otpCode: {
      type: String,
      required: [true, 'OTP code is required'],
      length: 6,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL index for automatic cleanup
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
  },
  {
    timestamps: true,
    collection: 'email_verifications',
  }
);

// Compound index for email and expiry optimization
emailVerificationSchema.index({ email: 1, expiresAt: 1 });
emailVerificationSchema.index({ email: 1, isUsed: 1 });

// Static method to create OTP
emailVerificationSchema.static('createOTP', async function (email: string): Promise<IEmailVerificationDocument> {
  // Generate 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Set expiration to 10 minutes from now
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);

  // Remove any existing non-expired OTPs for this email
  await this.deleteMany({ 
    email, 
    $or: [
      { isUsed: false },
      { expiresAt: { $gt: new Date() } }
    ]
  });

  // Create new OTP
  const verification = await this.create({
    email,
    otpCode,
    expiresAt,
    isUsed: false,
    attempts: 0,
    maxAttempts: 5,
  });

  return verification;
});

// Static method to verify OTP
emailVerificationSchema.static('verifyOTP', async function (
  email: string, 
  otpCode: string
): Promise<{ isValid: boolean; message: string }> {
  // Find the verification record
  const verification = await this.findOne({
    email,
    otpCode,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });

  if (!verification) {
    // Check if there's any verification record for this email
    const anyVerification = await this.findOne({ 
      email,
      expiresAt: { $gt: new Date() }
    });

    if (anyVerification) {
      // Increment attempts
      anyVerification.attempts += 1;
      await anyVerification.save();

      if (anyVerification.attempts >= anyVerification.maxAttempts) {
        // Mark as used to prevent further attempts
        anyVerification.isUsed = true;
        await anyVerification.save();
        return { 
          isValid: false, 
          message: 'Too many failed attempts. Please request a new verification code.' 
        };
      }

      return { 
        isValid: false, 
        message: `Invalid verification code. ${anyVerification.maxAttempts - anyVerification.attempts} attempts remaining.` 
      };
    }

    return { 
      isValid: false, 
      message: 'Invalid or expired verification code. Please request a new one.' 
    };
  }

  // Mark as used
  verification.isUsed = true;
  await verification.save();

  return { isValid: true, message: 'Email verified successfully!' };
});

// Static method to cleanup expired records
emailVerificationSchema.static('cleanupExpired', async function (): Promise<void> {
  await this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isUsed: true }
    ]
  });
});

// Create and export the EmailVerification model
const EmailVerification = (mongoose.models.EmailVerification as IEmailVerificationModel) || 
  mongoose.model<IEmailVerificationDocument, IEmailVerificationModel>('EmailVerification', emailVerificationSchema);

export default EmailVerification; 