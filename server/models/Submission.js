import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema(
  {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    residentId: { type: String, required: true, trim: true },
    timestamp: { type: Date, required: true },
    recordedAt: { type: Date }, // client-side recording start (live-only)
    videoBase64: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'pass', 'fail'],
      default: 'pending',
    },
    aiAssessment: {
      passed: Boolean,
      qualitySummary: String,
      appearsLive: Boolean,
      timestampsOrIssues: [String],
      rawResponse: String,
    },
  },
  { timestamps: true }
);

export const Submission = mongoose.model('Submission', submissionSchema);
