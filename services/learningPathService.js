const asyncHandler = require("express-async-handler");
const axios = require("axios");
const LearningPath = require("../models/learningPathModel");
const UserContext = require("../models/userContextModel");

const NodeCache = require("node-cache");
const { z } = require("zod");


/* ================= CACHE ================= */
const cache = new NodeCache({ stdTTL: 60 * 60 }); // 1 hour

/* ================= VALIDATION SCHEMAS ================= */

const requestSchema = z.object({
  goal: z.string().optional(),
  field: z.string().min(2),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  hours_per_day: z.number().min(0.5).max(12),
  background: z.string().optional(),
  language: z.string().optional(),
  target_months: z.number().min(1).max(24).optional(),
});

const aiResponseSchema = z.object({
  meta: z.object({
    path_title: z.string(),
    total_weeks: z.number(),
  }),
  phases: z.array(z.any()),
  weekly_schedule: z.any(),
  overall_milestones: z.array(z.string()),
});

/* ================= AXIOS INSTANCE ================= */

const aiClient = axios.create({
  baseURL: process.env.AI_BASE_URL,
  //timeout: 10000, // 10 sec
});

/* ================= HELPER ================= */

const generateCacheKey = (body) => {
  return JSON.stringify({
    field: body.field,
    level: body.level,
    goal: body.goal,
    hours: body.hours_per_day,
  });
};
// Normalizes AI response to match our LearningPath schema
const normalizeLearningPath = (aiData) => {
  return {
    pathTitle: aiData.meta?.path_title || "",
    totalWeeks: aiData.meta?.total_weeks || 0,

    phases: (aiData.phases || []).map((phase) => ({
      title: phase.phase_title,
      description: phase.objective,
      duration_weeks:
        (phase.week_end || 0) - (phase.week_start || 0) + 1,

      topics:
        phase.milestones?.map((m) =>
          typeof m === "string" ? m : m.title
        ) || [],

      resources:
        (phase.courses || []).map((course) => ({
          title: course.title,
          url: course.url,
          platform: course.platform,
          estimated_hours: course.estimated_hours || 0,
        })),
    })),

    weeklySchedule: aiData.weekly_schedule || {},
    milestones:
      aiData.overall_milestones?.map((m) => m.title) || [],
  };
};

/* ================= CONTROLLER ================= */
// @desc Generate Learning Path
// @route POST /api/learning-path/generate
// @access Private

exports.generateLearningPath = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  /* ================= VALIDATION ================= */

  const parsed = requestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid input",
      errors: parsed.error.errors,
    });
  }

  const body = parsed.data;

  /* ================= RATE LIMIT ================= */

  const recent = await LearningPath.findOne({
    user: userId,
    createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
  });

  if (recent) {
    return res.status(429).json({
      message: "Too many requests, try again later",
    });
  }

  /* ================= CHECK ACTIVE ================= */

  const existingPath = await LearningPath.findOne({
    user: userId,
    isActive: true,
  });

  if (existingPath) {
    return res.status(400).json({
      message: "Active learning path already exists",
    });
  }

  /* ================= CALL AI ================= */

  let aiData;

  try {
    const aiResponse = await aiClient.post("/ai/learning-path", body);
    aiData = aiResponse.data?.data;

    //console.log("RAW AI RESPONSE:", aiData);
  } catch (err) {
    const status = err.response?.status;
    const aiError = err.response?.data;

    console.error("AI ERROR:", aiError || err.message);

    if (status === 429) {
      return res.status(200).json({
        status: "quota_exceeded",
        message: "AI quota exceeded, try later",
      });
    }

    return res.status(503).json({
      message: "AI service temporarily unavailable",
    });
  }

  if (!aiData || !aiData.phases) {
    return res.status(500).json({
      message: "Invalid AI response",
    });
  }

  /* ================= SAVE RAW AI ================= */

  const learningPath = await LearningPath.create({
    user: userId,

    meta: aiData.meta,
    phases: aiData.phases,
    weekly_schedule: aiData.weekly_schedule,
    overall_milestones: aiData.overall_milestones,
    success_metrics: aiData.success_metrics,
    adaptation_tips: aiData.adaptation_tips,

    generatedFrom: {
      field: body.field,
      level: body.level,
      goal: body.goal,
      hoursPerDay: body.hours_per_day,
    },

    isActive: true,
  });

  /* ================= UPDATE USER CONTEXT ================= */

  const userContext = await UserContext.findOne({ user: userId });

  if (userContext) {
    const firstPhase = aiData.phases?.[0] || {};
    const firstCourse = firstPhase.courses?.[0] || {};

    userContext.pathTitle = aiData.meta?.path_title || "";
    userContext.totalPhases = aiData.phases?.length || 0;

    userContext.currentPhaseNumber = firstPhase.phase_number || 1;
    userContext.currentPhaseTitle = firstPhase.phase_title || "";

    userContext.currentCourseTitle = firstCourse.title || "";
    userContext.currentCourseUrl = firstCourse.search_query || "";

    /* remaining topics */
    userContext.remainingTopics =
      aiData.phases?.flatMap((phase) =>
        phase.courses?.flatMap((course) => course.topics || [])
      ) || [];

    userContext.stage = "learning";
    userContext.lastActivity = new Date();

    userContext.completedPhases = [];
    userContext.completedTopics = [];
    userContext.overallProgressPercent = 0;

    await userContext.save();
  }

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

  try {
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

} catch (err) {
      const aiError = err.response?.data;

      console.error("AI ERROR:", aiError || err.message);

      return res.status(503).json({
        message: "AI service temporarily unavailable",
        ai_error: aiError || null,
      });
    }

});