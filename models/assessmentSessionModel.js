const mongoose = require("mongoose");

const assessmentSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    sessionId: String,

    currentQuestion: Number,
    totalQuestions: Number,

    answers: [
      {
        questionId: Number,
        questionText: String,
        options: [
          {
            option: String,
            text: String,
          },
        ],
        explanation: String,
        answer: String,
      },
    ],

    isCompleted: {
      type: Boolean,
      default: false,
    },

    result: {
      level: String,
      strongTopics: [String],
      weakTopics: [String],
      summary: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "AssessmentSession",
  assessmentSessionSchema
);