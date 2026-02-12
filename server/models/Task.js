import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    windowStart: { type: Date, required: true },
    windowEnd: { type: Date, required: true },
    starsAwarded: { type: Number, default: 1 },
    eufyTaskId: { type: String, trim: true },
    cufyTaskId: { type: String, trim: true }, // deprecated alias for eufyTaskId
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

taskSchema.index({ windowEnd: 1, active: 1 });

export const Task = mongoose.model('Task', taskSchema);
