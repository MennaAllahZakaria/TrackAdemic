const asyncHandler = require("express-async-handler");
const Progress = require("../models/progressModel");
const LearningPath = require("../models/learningPathModel");
const UserContext = require("../models/userContextModel");

/* ================= HELPERS ================= */

const normalize = (str) => str.toLowerCase().trim();

exports.updateProgress = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const { topic, hours } = req.body;

  if (!topic && !hours) {
    return res.status(400).json({
      message: "topic or hours required",
    });
  }

  /* ================= GET LEARNING PATH ================= */

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
      completedTopics: [],
      strongTopics: [],
      weakTopics: [],
    });
  }

  /* ================= UPDATE HOURS ================= */

  if (hours) {
    progress.totalHoursStudied += hours;
    progress.hoursThisWeek += hours;
    progress.lastStudyDate = new Date();
  }

  /* ================= UPDATE TOPICS ================= */

  if (topic) {
    const exists = progress.completedTopics
      .map(normalize)
      .includes(normalize(topic));

    if (!exists) {
      progress.completedTopics.push(topic);
    }
  }

  /* ================= CALCULATE PROGRESS ================= */

  const phases = learningPath.phases || [];

  const totalTopics =
    phases.reduce(
      (acc, phase) => acc + (phase.topics?.length || 0),
      0
    ) || 1;

  progress.overallProgress =
    (progress.completedTopics.length / totalTopics) * 100;

  /* ================= DETERMINE CURRENT PHASE ================= */

  let completedCount = progress.completedTopics.length;
  let accumulated = 0;
  let currentPhaseIndex = 0;

  for (let i = 0; i < phases.length; i++) {
    const phaseTopics = phases[i].topics?.length || 0;
    accumulated += phaseTopics;

    if (completedCount <= accumulated) {
      currentPhaseIndex = i;
      break;
    }
  }

  /* ================= UPDATE USER CONTEXT ================= */

  const userContext = await UserContext.findOne({ user: userId });

  if (userContext) {
    const currentPhase = phases[currentPhaseIndex] || {};
    const firstResource = currentPhase.resources?.[0] || {};

    userContext.currentPhaseNumber = currentPhaseIndex + 1;
    userContext.currentPhaseTitle = currentPhase.title || "";

    userContext.currentCourseTitle = firstResource.title || "";
    userContext.currentCourseUrl = firstResource.url || "";

    userContext.completedTopics = progress.completedTopics;
    userContext.overallProgressPercent = progress.overallProgress;

    userContext.totalHoursStudied = progress.totalHoursStudied;
    userContext.hoursStudiedThisWeek = progress.hoursThisWeek;

    /* ================= PHASE COMPLETION ================= */

    if (
      progress.completedTopics.length >= accumulated &&
      !userContext.completedPhases.includes(currentPhaseIndex)
    ) {
      userContext.completedPhases.push(currentPhaseIndex);
    }

    userContext.lastActivity = new Date();

    await userContext.save();
  }

  /* ================= SAVE ================= */

  await progress.save();

  /* ================= RESPONSE ================= */

  res.status(200).json({
    status: "success",
    data: {
      progress,
      currentPhase: currentPhaseIndex + 1,
    },
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