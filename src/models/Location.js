import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

locationSchema.index({ name: 1 });

export const Location = mongoose.model('Location', locationSchema);
