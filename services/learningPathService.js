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
  timeout: 10000, // 10 sec
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

/* ================= CONTROLLER ================= */
// @desc Generate Learning Path
// @route POST /api/learning-path/generate
// @access Private

exports.generateLearningPath = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  /* ================= VALIDATE INPUT ================= */

  const parsed = requestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid input",
      errors: parsed.error.errors,
    });
  }

  const body = parsed.data;

  /* ================= RATE LIMIT (simple) ================= */

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

  /* ================= CACHE ================= */

  const cacheKey = generateCacheKey(body);
  let aiData = cache.get(cacheKey);

  if (!aiData) {
    try {
      const aiResponse = await aiClient.post("/ai/learning-path", body);

      const raw = aiResponse.data?.data;

      const validated = aiResponseSchema.safeParse(raw);

      if (!validated.success) {
        return res.status(500).json({
          message: "Invalid AI response structure",
        });
      }

      aiData = validated.data;

      cache.set(cacheKey, aiData);
    } catch (error) {
      const aiError = err.response?.data;

      console.error("AI ERROR:", aiError || err.message);

      return res.status(503).json({
        message: "AI service temporarily unavailable",
        ai_error: aiError || null,
      });
    }
  }

  /* ================= SAVE ================= */

  const learningPath = await LearningPath.create({
    user: userId,

    pathTitle: aiData.meta.path_title,
    totalWeeks: aiData.meta.total_weeks,

    phases: aiData.phases,
    weeklySchedule: aiData.weekly_schedule,
    milestones: aiData.overall_milestones,

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
    userContext.pathTitle = aiData.meta.path_title;
    userContext.totalPhases = aiData.phases.length;

    userContext.currentPhaseNumber = 1;
    userContext.currentPhaseTitle = aiData.phases[0]?.title || "";

    userContext.currentCourseTitle =
      aiData.phases[0]?.resources?.[0]?.title || "";

    userContext.currentCourseUrl =
      aiData.phases[0]?.resources?.[0]?.url || "";

    userContext.stage = "learning";
    userContext.lastActivity = new Date();

    userContext.completedPhases = [];
    userContext.completedTopics = [];
    userContext.overallProgressPercent = 0;

    await userContext.save();
  }

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