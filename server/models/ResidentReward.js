import mongoose from 'mongoose';

const residentRewardSchema = new mongoose.Schema(
  {
    residentId: { type: String, required: true, trim: true, unique: true },
    stars: { type: Number, default: 0 },
    totalValidated: { type: Number, default: 0 },
    bonusClaimedWeeks: { type: [String], default: [] }, // e.g. ["2025-02-10"] = Monday of that week
  },
  { timestamps: true }
);

residentRewardSchema.index({ residentId: 1 });

export const ResidentReward = mongoose.model('ResidentReward', residentRewardSchema);
