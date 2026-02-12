import mongoose from 'mongoose';

const moodEnum = ['sad', 'low', 'neutral', 'good', 'happy'];

const welfareCheckInSchema = new mongoose.Schema(
  {
    residentId: { type: String, required: true, trim: true },
    name: { type: String, trim: true },
    mood: { type: String, enum: moodEnum, required: true },
    conversation: [
      {
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true },
      },
    ],
    summary: { type: String },
    status: {
      type: String,
      enum: ['mood_selected', 'in_progress', 'completed'],
      default: 'mood_selected',
    },
  },
  { timestamps: true }
);

welfareCheckInSchema.index({ residentId: 1, createdAt: -1 });

export const WelfareCheckIn = mongoose.model('WelfareCheckIn', welfareCheckInSchema);
export { moodEnum };
