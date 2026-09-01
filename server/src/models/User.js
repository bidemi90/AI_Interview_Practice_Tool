import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema(
  {
    experienceLevel: { type: String, enum: ['entry', 'mid', 'senior', 'lead', 'executive'] },
    yearsOfExperience: { type: Number, min: 0, max: 60 },
    preferredJobTitle: { type: String, trim: true, maxlength: 100 },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    targetRoles: [{ type: String, trim: true, maxlength: 100 }],
    profile: { type: profileSchema, default: () => ({}) },
    lastLoginAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform(_document, returnedObject) {
        delete returnedObject.passwordHash;
        delete returnedObject.__v;
        return returnedObject;
      },
    },
  },
);

export const User = mongoose.model('User', userSchema);
