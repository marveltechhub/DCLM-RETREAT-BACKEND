import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema(
  {
    registrationNumber: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_say'], required: true },
    age: { type: Number, required: true, min: 1, max: 120 },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: null },
    address: { type: String, required: true, trim: true },
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
    nextOfKinName: { type: String, required: true, trim: true },
    nextOfKinPhone: { type: String, required: true, trim: true },
    profilePictureUrl: { type: String, default: '', trim: true },
    registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    campSlug: { type: String, default: 'easter-retreat-2026', index: true },
  },
  { timestamps: true }
);

registrationSchema.index(
  { phone: 1, campSlug: 1 },
  { unique: true, name: 'unique_phone_per_camp' }
);
registrationSchema.index(
  { email: 1, campSlug: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: 'string', $gt: '' } },
    name: 'unique_email_per_camp_when_set',
  }
);
registrationSchema.index({ location: 1, createdAt: -1 });
registrationSchema.index({ fullName: 'text', phone: 'text', registrationNumber: 'text' });

export const Registration = mongoose.model('Registration', registrationSchema);
