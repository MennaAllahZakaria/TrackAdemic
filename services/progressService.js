const asyncHandler = require("express-async-handler");
const Progress = require("../models/progressModel");
const LearningPath = require("../models/learningPathModel");

exports.updateProgress = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const { topic, hours } = req.body;

  if (!topic && !hours) {
    return res.status(400).json({
      message: "topic or hours required",
    });
  }

  /* ================= GET PATH ================= */

  const learningPath = await LearningPath.findOne({
    user: userId,
    isActive: true,
  });

  if (!learningPath) {
    return res.status(404).json({
      message: "No learning path found",
    });
  }

  /* ================= GET / CREATE PROGRESS ================= */

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

  /* ================= UPDATE HOURS ================= */

  if (hours) {
    progress.totalHoursStudied += hours;
    progress.hoursThisWeek += hours;
    progress.lastStudyDate = new Date();
  }

  /* ================= UPDATE TOPICS ================= */

  if (topic && !progress.completedTopics.includes(topic)) {
    progress.completedTopics.push(topic);
  }

  /* ================= CALCULATE PROGRESS ================= */

  const totalTopics =
    learningPath.phases.reduce((acc, phase) => {
      return acc + (phase.topics?.length || 0);
    }, 0) || 1;

  progress.overallProgress =
    (progress.completedTopics.length / totalTopics) * 100;

  await progress.save();

  res.status(200).json({
    status: "success",
    data: progress,
  });
});

exports.getMyProgress = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const progress = await Progress.findOne({ user: userId });

  if (!progress) {
    return res.status(404).json({
      message: "No progress found",
    });
  }

  res.status(200).json({
    status: "success",
    data: progress,
  });
});