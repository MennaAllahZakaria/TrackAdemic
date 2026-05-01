const asyncHandler = require("express-async-handler");
const Progress = require("../models/progressModel");
const LearningPath = require("../models/learningPathModel");
const UserContext = require("../models/userContextModel");
const { sendReminder } = require("../cornJobs/dailyReminder");

/* ================= HELPERS ================= */

const normalize = (str) =>
  str.toLowerCase().replace(/\s+/g, "").trim();

const extractAllTopics = (phases) => {
  return phases.flatMap((phase) =>
    phase.courses?.flatMap((course) => course.topics || []) || []
  );
};

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
    sendReminder(req.user, "progress");
  }

  /* ================= UPDATE TOPIC ================= */

  if (topic) {
    const exists = progress.completedTopics
      .map(normalize)
      .includes(normalize(topic));

    if (!exists) {
      progress.completedTopics.push(topic);
    }
  }

  /* ================= EXTRACT TOPICS ================= */

  const allTopics = extractAllTopics(learningPath.phases);

  const totalTopics = allTopics.length || 1;

  progress.overallProgress =
    (progress.completedTopics.length / totalTopics) * 100;

  /* ================= DETERMINE CURRENT PHASE ================= */

  let currentPhaseIndex = 0;
  let accumulated = 0;

  for (let i = 0; i < learningPath.phases.length; i++) {
    const phaseTopics =
      extractAllTopics([learningPath.phases[i]]).length;

    accumulated += phaseTopics;

    if (progress.completedTopics.length <= accumulated) {
      currentPhaseIndex = i;
      break;
    }
  }

  /* ================= UPDATE USER CONTEXT ================= */

  const userContext = await UserContext.findOne({ user: userId });

  if (userContext) {
    const currentPhase = learningPath.phases[currentPhaseIndex] || {};
    const firstCourse = currentPhase.courses?.[0] || {};

    userContext.currentPhaseNumber = currentPhase.phase_number || 1;
    userContext.currentPhaseTitle = currentPhase.phase_title || "";

    userContext.currentCourseTitle = firstCourse.title || "";
    userContext.currentCourseUrl = firstCourse.search_query || "";

    userContext.completedTopics = progress.completedTopics;
    userContext.overallProgressPercent = progress.overallProgress;

    userContext.totalHoursStudied = progress.totalHoursStudied;
    userContext.hoursStudiedThisWeek = progress.hoursThisWeek;

    /* ================= REMAINING TOPICS ================= */

    userContext.remainingTopics = allTopics.filter(
      (t) =>
        !progress.completedTopics
          .map(normalize)
          .includes(normalize(t))
    );

    /* ================= PHASE COMPLETION ================= */

    if (
      progress.completedTopics.length >= accumulated &&
      !userContext.completedPhases.includes(currentPhaseIndex)
    ) {
      userContext.completedPhases.push(currentPhaseIndex);
      sendReminder(req.user, "milestone");
    }

    userContext.lastActivity = new Date();

    await userContext.save();
  }

  await progress.save();

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