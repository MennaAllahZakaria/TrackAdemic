const asyncHandler = require("express-async-handler");
const axios = require("axios");
const QuizAttempt = require("../models/quizModel");
const Progress = require("../models/progressModel");
const LearningPath = require("../models/learningPathModel");
const UserContext = require("../models/userContextModel");
const Quiz = require("../models/questionModel");
const normalize = (str) => str.toLowerCase().trim();

exports.generateQuiz = asyncHandler(async (req, res) => {
  const { topic, level, num_questions, course_title } = req.body;

  if (!topic) {
    return res.status(400).json({
      message: "topic is required",
    });
  }

  let aiData;

  try {
    const response = await axios.post(
      process.env.AI_BASE_URL + "/ai/quiz",
      {
        topic,
        level,
        num_questions,
        course_title,
      },
    );

    aiData = response.data?.data;
  } catch (err) {
    return res.status(500).json({
      message: "AI failed to generate quiz",
    });
  }

  if (!aiData) {
    return res.status(500).json({
      message: "Invalid AI response",
    });
  }

  /* ================= SAVE QUIZ ================= */

  const quiz = await Quiz.create({
    user: req.user._id,
    topic: aiData.topic,
    level: aiData.level,
    questions: aiData.questions,
    passing_score: aiData.passing_score,
    practical_task: {
      title: aiData.practical_task.title,
      description: aiData.practical_task.description,
      expected_output: aiData.practical_task.expected_output,
      estimated_minutes: aiData.practical_task.estimated_minutes,
      evaluation_criteria: aiData.practical_task.evaluation_criteria,
    }
  });

  res.status(200).json({
    status: "success",
    quizId: quiz._id,
    data: aiData,
  });
});

exports.submitQuiz = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { answers, quizId } = req.body;

  if (!answers || !quizId) {
    return res.status(400).json({
      message: "answers and quizId required",
    });
  }

  const quiz = await Quiz.findOne({
    _id: quizId,
    user: userId,
  });

  if (!quiz) {
    return res.status(404).json({
      message: "Quiz not found",
    });
  }

  if (quiz.isSubmitted) {
    return res.status(400).json({
      message: "Quiz already submitted",
    });
  }

  let score = 0;
  const results = [];

  quiz.questions.forEach((q) => {
    const userAnswer = answers[q.id];
    const isCorrect = userAnswer === q.correct_answer;
    const CorrectAnswer = q.correct_answer;
    const Explanation = q.explanation; 

    if (isCorrect) score++;

    results.push({
      question: q.question,
      correct: isCorrect,
      topic: quiz.topic,
      userAnswer,
      CorrectAnswer,
      Explanation,
    });
  });

  const total = quiz.questions.length;
  const percentage = (score / total) * 100;

  quiz.isSubmitted = true;
  await quiz.save();

  await QuizAttempt.create({
    user: userId,
    topic: quiz.topic,
    score,
    total,
    percentage,
    answers,
    results,
  });

  res.status(200).json({
    status: "success",
    score,
    total,
    percentage,
    results,
  });
});

exports.getMyQuizzes = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const quizzes = await Quiz.find({ user: userId })
    .select("topic level isSubmitted createdAt passing_score")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: quizzes.length,
    data: quizzes,
  });
});

exports.getQuizById = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;

  const quiz = await Quiz.findOne({
    _id: id,
    user: userId,
  });

  if (!quiz) {
    return res.status(404).json({
      message: "Quiz not found",
    });
  }

  // If quiz is not submitted, don't send correct answers and explanations
  if (!quiz.isSubmitted) {
    const questions = quiz.questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
    }));

    return res.status(200).json({
      status: "success",
      data: {
        ...quiz.toObject(),
        questions,
      },
    });
  }

  res.status(200).json({
    status: "success",
    data: quiz,
  });
});

exports.getAllQuizzes = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, topic, submitted } = req.query;

  const filter = {};

  if (topic) filter.topic = topic;
  if (submitted !== undefined) {
    filter.isSubmitted = submitted === "true";
  }

  const quizzes = await Quiz.find(filter)
    .populate("user", "firstName lastName email")
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await Quiz.countDocuments(filter);

  res.status(200).json({
    status: "success",
    page: Number(page),
    total,
    results: quizzes.length,
    data: quizzes,
  });
});