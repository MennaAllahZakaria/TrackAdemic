const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    learningPath: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LearningPath",
      required: true,
    },

    completedTopics: [String],

    weakTopics: [String],
    strongTopics: [String],

    totalHoursStudied: {
      type: Number,
      default: 0,
    },

    hoursThisWeek: {
      type: Number,
      default: 0,
    },

    lastStudyDate: Date,

    overallProgress: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Progress", progressSchema);