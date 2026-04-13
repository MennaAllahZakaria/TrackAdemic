const asyncHandler = require("express-async-handler");
const axios = require("axios");
const LearningPath = require("../models/learningPathModel");

// @desc Generate Learning Path
// @route POST /api/learning-path/generate
// @access Private
exports.generateLearningPath = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const {
    goal,
    field,
    level,
    hours_per_day,
    background,
    language,
    target_months,
  } = req.body;

  /* ================= VALIDATION ================= */

  if (!field || !level) {
    return res.status(400).json({
      message: "field and level are required",
    });
  }

  /* ================= CHECK EXISTING ================= */

  const existingPath = await LearningPath.findOne({
    user: userId,
    isActive: true,
  });

  if (existingPath) {
    return res.status(400).json({
      message: "You already have an active learning path",
    });
  }

  /* ================= CALL AI ================= */

  const aiResponse = await axios.post(
    process.env.AI_BASE_URL + "/ai/learning-path",
    {
      goal,
      field,
      level,
      background,
      hours_per_day,
      language,
      target_months,
    }
  );

  const aiData = aiResponse.data?.data;

  if (!aiData) {
    return res.status(500).json({
      message: "AI failed to generate learning path",
    });
  }

  /* ================= MAP DATA ================= */

  const learningPath = await LearningPath.create({
    user: userId,

    pathTitle: aiData.meta?.path_title,
    totalWeeks: aiData.meta?.total_weeks,

    phases: aiData.phases || [],

    weeklySchedule: aiData.weekly_schedule || {},
    milestones: aiData.overall_milestones || [],

    generatedFrom: {
      field,
      level,
      goal,
      hoursPerDay: hours_per_day,
    },

    isActive: true,
  });

  /* ================= RESPONSE ================= */

  res.status(201).json({
    status: "success",
    data: learningPath,
  });
});

// @desc Get current learning path
// @route GET /api/learning-path/me
// @access Private
exports.getMyLearningPath = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const learningPath = await LearningPath.findOne({
    user: userId,
    isActive: true,
  });

  if (!learningPath) {
    return res.status(404).json({
      message: "No active learning path found",
    });
  }

  res.status(200).json({
    status: "success",
    data: learningPath,
  });
});

// @desc Regenerate learning path
// @route POST /api/learning-path/regenerate
// @access Private
exports.regenerateLearningPath = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const currentPath = await LearningPath.findOne({
    user: userId,
    isActive: true,
  });

  if (!currentPath) {
    return res.status(404).json({
      message: "No learning path to regenerate",
    });
  }

  /* ================= ARCHIVE OLD ================= */

  currentPath.isActive = false;
  await currentPath.save();

  /* ================= REUSE DATA ================= */

  const { field, level, goal, hoursPerDay } =
    currentPath.generatedFrom;

  /* ================= CALL AI ================= */

  const aiResponse = await axios.post(
    process.env.AI_BASE_URL + "/ai/learning-path",
    {
      field,
      level,
      goal,
      hours_per_day: hoursPerDay,
    }
  );

  const aiData = aiResponse.data?.data;

  /* ================= CREATE NEW ================= */

  const newPath = await LearningPath.create({
    user: userId,
    pathTitle: aiData.meta?.path_title,
    totalWeeks: aiData.meta?.total_weeks,
    phases: aiData.phases || [],
    weeklySchedule: aiData.weekly_schedule || {},
    milestones: aiData.overall_milestones || [],
    generatedFrom: {
      field,
      level,
      goal,
      hoursPerDay,
    },
    version: currentPath.version + 1,
    isActive: true,
  });

  res.status(201).json({
    status: "success",
    data: newPath,
  });
});