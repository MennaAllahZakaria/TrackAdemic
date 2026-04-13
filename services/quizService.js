const asyncHandler = require("express-async-handler");
const axios = require("axios");
const QuizAttempt = require("../models/quizModel");
const Progress = require("../models/progressModel");
const LearningPath = require("../models/learningPathModel");


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
      { timeout: 8000 }
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

  res.status(200).json({
    status: "success",
    data: aiData,
  });
});


exports.submitQuiz = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const { answers, questions, topic } = req.body;

  if (!answers || !questions) {
    return res.status(400).json({
      message: "answers and questions required",
    });
  }

  let score = 0;
  const results = [];

  /* ================= EVALUATE ================= */

  questions.forEach((q) => {
    const userAnswer = answers[q.id];
    const isCorrect = userAnswer === q.correct_answer;

    if (isCorrect) score++;

    results.push({
      question: q.question,
      correct: isCorrect,
      topic,
    });
  });

  const total = questions.length;
  const percentage = (score / total) * 100;

  /* ================= SAVE ATTEMPT ================= */

  await QuizAttempt.create({
    user: userId,
    topic,
    score,
    total,
    percentage,
    answers,
    results,
  });

  /* ================= UPDATE PROGRESS ================= */

  const learningPath = await LearningPath.findOne({
    user: userId,
    isActive: true,
  });

  if (learningPath) {
    let progress = await Progress.findOne({
      user: userId,
      learningPath: learningPath._id,
    });

    if (!progress) {
      progress = await Progress.create({
        user: userId,
        learningPath: learningPath._id,
      });
    }

    if (percentage < 50) {
      if (!progress.weakTopics.includes(topic)) {
        progress.weakTopics.push(topic);
      }
    } else {
      if (!progress.strongTopics.includes(topic)) {
        progress.strongTopics.push(topic);
      }
    }

    await progress.save();
  }

  /* ================= RESPONSE ================= */

  res.status(200).json({
    status: "success",
    score,
    total,
    percentage,
    results,
  });
});