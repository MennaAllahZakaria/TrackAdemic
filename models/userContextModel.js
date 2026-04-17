const mongoose = require("mongoose");

const userContextSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    name: String,
    goal: String,
    field: String,

    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },

    startedAt: Date,

    stage: {
      type: String,
      enum: ["assessment", "onboarding", "learning", "recovery"],
      default: "assessment",
    },

    pathTitle: String,
    totalPhases: Number,

    currentPhaseNumber: Number,
    currentPhaseTitle: String,

    currentCourseTitle: String,
    currentCourseUrl: String,

    completedPhases: [Number],
    completedTopics: [String],
    remainingTopics: [String],

    overallProgressPercent: {
        type: Number,
        default: 0,
    },

    quizScores: [Number],
    averageQuizScore: Number,

    strongTopics: [String],
    weakTopics: [String],

    hoursPerDay: Number,
    hoursStudiedThisWeek: Number,
    targetHoursThisWeek: Number,
    totalHoursStudied: Number,

    struggles: String,

    lastActivity: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserContext", userContextSchema);