import mongoose, { Document, Model, Schema } from 'mongoose';

// Rate deck assignment interface
export interface IRateDeckAssignment {
  userId: mongoose.Types.ObjectId;
  rateDeckId: mongoose.Types.ObjectId;
  rateDeckType: 'number' | 'sms';
  assignedBy: string;
  assignedAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Rate deck assignment document interface
export interface IRateDeckAssignmentDocument extends IRateDeckAssignment, Document {
  id: string;
}

// Rate deck assignment model interface
export interface IRateDeckAssignmentModel extends Model<IRateDeckAssignmentDocument> {}

// Rate deck assignment schema
const rateDeckAssignmentSchema = new Schema<IRateDeckAssignmentDocument, IRateDeckAssignmentModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    rateDeckId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Rate deck ID is required'],
      // Note: index is covered by compound indexes below
    },
    rateDeckType: {
      type: String,
      required: [true, 'Rate deck type is required'],
      enum: {
        values: ['number', 'sms'],
        message: 'Rate deck type must be either number or sms',
      },
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
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'rate_deck_assignments',
  }
);

// Add compound indexes for better query performance
rateDeckAssignmentSchema.index({ userId: 1, rateDeckType: 1, isActive: 1 });
rateDeckAssignmentSchema.index({ rateDeckId: 1, rateDeckType: 1, isActive: 1 });
rateDeckAssignmentSchema.index({ userId: 1, rateDeckId: 1, rateDeckType: 1 }, { unique: true }); // Prevent duplicate assignments

// Create and export the RateDeckAssignment model
const RateDeckAssignment = (mongoose.models.RateDeckAssignment as IRateDeckAssignmentModel) || 
  mongoose.model<IRateDeckAssignmentDocument, IRateDeckAssignmentModel>('RateDeckAssignment', rateDeckAssignmentSchema);

export default RateDeckAssignment; 