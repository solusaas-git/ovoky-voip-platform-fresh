import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { UserRole } from '@/types/user';

// Re-export the enum for backward compatibility
export { UserRole };

// User interface
export interface IUser {
  email: string;
  name: string;
  password?: string;
  role: UserRole;
  sippyAccountId?: number;
  sippyCustomerId?: number;
  isEmailVerified: boolean;
  emailVerifiedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  creationMethod: 'signup' | 'admin' | 'google';
  googleId?: string;
  avatar?: string;
  notificationPermissionRequested: boolean;
  notificationPermissionRequestedAt?: Date;
  isSuspended: boolean;
  suspendedAt?: Date;
  suspensionReason?: string;
  suspendedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// User methods interface
export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  createPasswordResetToken(): string;
  isPasswordResetTokenValid(token: string): boolean;
}

// User model interface
export interface UserModel extends Model<IUser, {}, IUserMethods> {
  findByEmail(email: string): Promise<(Document<unknown, {}, IUser> & IUser & IUserMethods) | null>;
}

// User schema
const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    password: {
      type: String,
      required: function(this: IUser) {
        // Password is required for signup and admin created users, but not for Google OAuth
        return this.creationMethod !== 'google';
      },
      validate: {
        validator: function(password: string) {
          // Only validate length if password is provided
          return !password || password.length >= 8;
        },
        message: 'Password should be at least 8 characters'
      },
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CLIENT,
    },
    sippyAccountId: {
      type: Number,
    },
    sippyCustomerId: {
      type: Number,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifiedAt: {
      type: Date,
    },
    passwordResetToken: {
      type: String,
    },
    passwordResetExpires: {
      type: Date,
    },
    creationMethod: {
      type: String,
      enum: ['signup', 'admin', 'google'],
      required: true,
    },
    googleId: {
      type: String,
    },
    avatar: {
      type: String,
    },
    notificationPermissionRequested: {
      type: Boolean,
      default: false,
    },
    notificationPermissionRequestedAt: {
      type: Date,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    suspendedAt: {
      type: Date,
    },
    suspensionReason: {
      type: String,
      trim: true,
    },
    suspendedBy: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to hash password
userSchema.pre('save', async function (next) {
  // Only hash the password if it exists and is modified (or new)
  if (!this.password || !this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    // TypeScript guard: we know password exists here due to the check above
    this.password = await bcrypt.hash(this.password!, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare passwords
userSchema.method('comparePassword', async function (candidatePassword: string): Promise<boolean> {
  // If no password is set (OAuth user), return false
  if (!this.password) return false;
  // TypeScript guard: we know password exists here due to the check above
  return bcrypt.compare(candidatePassword, this.password!);
});

// Static method to find user by email
userSchema.static('findByEmail', async function findByEmail(email: string) {
  return this.findOne({ email }).select('+password');
});

// Method to create a password reset token
userSchema.method('createPasswordResetToken', function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return resetToken;
});

// Method to check if a password reset token is valid
userSchema.method('isPasswordResetTokenValid', function (token: string): boolean {
  return (
    this.passwordResetToken === crypto.createHash('sha256').update(token).digest('hex') &&
    !!this.passwordResetExpires &&
    this.passwordResetExpires > new Date()
  );
});

// Create and export the User model
const User = (mongoose.models.User as UserModel) || mongoose.model<IUser, UserModel>('User', userSchema);

export default User; 