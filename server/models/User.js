import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['resident', 'admin'], default: 'resident' },
    residentId: { type: String, trim: true },
    name: { type: String, trim: true },
  },
  { timestamps: true }
);

userSchema.index({ username: 1 });

export const User = mongoose.model('User', userSchema);

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function checkPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
