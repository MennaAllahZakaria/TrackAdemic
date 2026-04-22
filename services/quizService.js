const asyncHandler = require("express-async-handler");
const axios = require("axios");
const QuizAttempt = require("../models/quizModel");
const Progress = require("../models/progressModel");
const LearningPath = require("../models/learningPathModel");
const UserContext = require("../models/userContextModel");
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

  res.status(200).json({
    status: "success",
    data: aiData,
  });
});


exports.submitQuiz = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const { answers, questions, topic } = req.body;

  if (!answers || !questions || !topic) {
    return res.status(400).json({
      message: "answers, questions and topic required",
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

  /* ================= GET LEARNING PATH ================= */

  const learningPath = await LearningPath.findOne({
    user: userId,
    isActive: true,
  });

  /* ================= UPDATE PROGRESS ================= */

  let progress;

  if (learningPath) {
    progress = await Progress.findOne({
      user: userId,
      learningPath: learningPath._id,
    });

    if (!progress) {
      progress = await Progress.create({
        user: userId,
        learningPath: learningPath._id,
        completedTopics: [],
        strongTopics: [],
        weakTopics: [],
      });
    }

    const topicNormalized = normalize(topic);

    /* weak / strong */

    if (percentage < 50) {
      if (
        !progress.weakTopics.map(normalize).includes(topicNormalized)
      ) {
        progress.weakTopics.push(topic);
      }
    } else {
      if (
        !progress.strongTopics.map(normalize).includes(topicNormalized)
      ) {
        progress.strongTopics.push(topic);
      }

      /* ================= MARK TOPIC COMPLETED ================= */
      if (
        !progress.completedTopics
          .map(normalize)
          .includes(topicNormalized)
      ) {
        progress.completedTopics.push(topic);
      }
    }

    await progress.save();
  }

  /* ================= UPDATE USER CONTEXT ================= */

  const userContext = await UserContext.findOne({ user: userId });

  if (userContext) {
    /* quiz scores */
    userContext.quizScores.push(percentage);

    const avg =
      userContext.quizScores.reduce((a, b) => a + b, 0) /
      userContext.quizScores.length;

    userContext.averageQuizScore = avg;

    /* sync topics */
    if (progress) {
      userContext.strongTopics = progress.strongTopics;
      userContext.weakTopics = progress.weakTopics;
      userContext.completedTopics = progress.completedTopics;
    }

    userContext.lastActivity = new Date();

    await userContext.save();
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