const mongoose = require("mongoose");

const phaseSchema = new mongoose.Schema({
  title: String,
  description: String,
  duration_weeks: Number,
  topics: [String],
  resources: [
    {
      title: String,
      url: String,
      platform: String,
      estimated_hours: Number,
    },
  ],
});

const learningPathSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    //  Meta Info
    pathTitle: String,
    totalWeeks: Number,

    //  Core Content
    phases: [phaseSchema],

    weeklySchedule: {
      type: Object,
    },

    milestones: [String],

    //  Progress Tracking
    currentPhase: {
      type: Number,
      default: 0,
    },

    completedPhases: [
      {
        type: Number,
      },
    ],

    progressPercent: {
      type: Number,
      default: 0,
    },

    generatedFrom: {
      field: String,
      level: String,
      goal: String,
      hoursPerDay: Number,
    },

    version: {
      type: Number,
      default: 1,
    },
    isActive: Boolean,
    isArchived: Boolean
  },
  { timestamps: true }
);

module.exports = mongoose.model("LearningPath", learningPathSchema);