const mongoose = require("mongoose");

const quizAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    topic: String,
    score: Number,
    total: Number,
    percentage: Number,

    answers: Object,

    results: [
      {
        question: String,
        correct: Boolean,
        topic: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("QuizAttempt", quizAttemptSchema);