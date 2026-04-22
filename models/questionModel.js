const { timingSafeEqual } = require("crypto");
const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    id: Number,
    question: String,
    options: Object,
    correct_answer: String,
    explanation: String,
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    topic: String,
    level: String,

    questions: [questionSchema],

    practical_task: {
        title: String,
        description: String,
        expected_output: String,
        estimated_minutes: Number,
        evaluation_criteria: [String],
    },

    passing_score: Number,

    isSubmitted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quiz", quizSchema);