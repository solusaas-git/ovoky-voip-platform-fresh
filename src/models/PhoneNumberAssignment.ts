import mongoose, { Document, Model, Schema } from 'mongoose';

// Phone Number Assignment interface
export interface IPhoneNumberAssignment {
  phoneNumberId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  assignedBy: string;
  assignedAt: Date;
  unassignedAt?: Date;
  unassignedBy?: string;
  unassignedReason?: string;
  monthlyRate: number;
  setupFee: number;
  currency: string;
  billingStartDate: Date;
  billingEndDate?: Date;
  totalBilled?: number;
  status: 'active' | 'ended';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Phone Number Assignment document interface
export interface IPhoneNumberAssignmentDocument extends IPhoneNumberAssignment, Document {
  _id: mongoose.Types.ObjectId;
}

// Phone Number Assignment model interface
export interface IPhoneNumberAssignmentModel extends Model<IPhoneNumberAssignmentDocument> {}

// Phone Number Assignment schema
const phoneNumberAssignmentSchema = new Schema<IPhoneNumberAssignmentDocument, IPhoneNumberAssignmentModel>(
  {
    phoneNumberId: {
      type: Schema.Types.ObjectId,
      ref: 'PhoneNumber',
      required: [true, 'Phone number ID is required'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    assignedBy: {
      type: String,
      required: [true, 'Assigned by is required'],
      trim: true,
    },
    assignedAt: {
      type: Date,
      required: [true, 'Assigned at date is required'],
      default: Date.now,
      index: true,
    },
    unassignedAt: {
      type: Date,
      index: true,
    },
    unassignedBy: {
      type: String,
      trim: true,
    },
    unassignedReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Unassigned reason cannot exceed 500 characters'],
    },
    monthlyRate: {
      type: Number,
      required: [true, 'Monthly rate is required'],
      min: [0, 'Monthly rate cannot be negative'],
    },
    setupFee: {
      type: Number,
      required: [true, 'Setup fee is required'],
      min: [0, 'Setup fee cannot be negative'],
      default: 0,
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      uppercase: true,
      trim: true,
      minlength: [3, 'Currency must be 3 characters'],
      maxlength: [3, 'Currency must be 3 characters'],
      default: 'USD',
    },
    billingStartDate: {
      type: Date,
      required: [true, 'Billing start date is required'],
      index: true,
    },
    billingEndDate: {
      type: Date,
      index: true,
    },
    totalBilled: {
      type: Number,
      min: [0, 'Total billed cannot be negative'],
      default: 0,
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['active', 'ended'],
        message: 'Status must be active or ended',
      },
      default: 'active',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
    collection: 'phone_number_assignments',
  }
);

// Add compound indexes for better query performance
phoneNumberAssignmentSchema.index({ phoneNumberId: 1, status: 1 });
phoneNumberAssignmentSchema.index({ userId: 1, status: 1 });
phoneNumberAssignmentSchema.index({ billingStartDate: 1, billingEndDate: 1 });
phoneNumberAssignmentSchema.index({ assignedAt: -1 });

// Export the model
const PhoneNumberAssignment: IPhoneNumberAssignmentModel = mongoose.models.PhoneNumberAssignment || mongoose.model<IPhoneNumberAssignmentDocument, IPhoneNumberAssignmentModel>('PhoneNumberAssignment', phoneNumberAssignmentSchema);
export default PhoneNumberAssignment; 