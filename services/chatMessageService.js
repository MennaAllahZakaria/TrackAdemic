const asyncHandler = require("express-async-handler");
const axios = require("axios");

const ChatMessage = require("../models/chatMessageModel");
const UserContext = require("../models/userContextModel");
const Progress = require("../models/progressModel");
const LearningPath = require("../models/learningPathModel");

/* ================= HELPERS ================= */

const getLastMessages = async (userId) => {
  const messages = await ChatMessage.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  return messages.reverse().map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
};

const detectTopic = (message) => {
  const topics = ["flexbox", "grid", "javascript", "react", "css", "html"];
  const lower = message.toLowerCase();
  return topics.find((t) => lower.includes(t)) || null;
};

const isWeakSignal = (message) => {
  const signals = ["مش فاهم", "صعب", "مش واضح", "مش قادر"];
  return signals.some((s) => message.includes(s));
};

/* ================= CONTROLLER ================= */

exports.sendMessage = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      message: "message is required",
    });
  }

  /* ================= GET USER CONTEXT ================= */

  const userContext = await UserContext.findOne({ user: userId });

  if (!userContext) {
    return res.status(400).json({
      message: "User context not found",
    });
  }

  /* ================= SAVE USER MESSAGE ================= */

  await ChatMessage.create({
    user: userId,
    role: "user",
    content: message,
  });

  /* ================= GET HISTORY ================= */

  const chatHistory = await getLastMessages(userId);

  /* ================= CALL AI ================= */

  const formattedContext = {
      name: userContext.name,
      goal: userContext.goal,
      field: userContext.field,
      level: userContext.level,

      stage: userContext.stage,

      path_title: userContext.pathTitle,
      total_phases: userContext.totalPhases,

      current_phase_number: userContext.currentPhaseNumber,
      current_phase_title: userContext.currentPhaseTitle,

      current_course_title: userContext.currentCourseTitle,
      current_course_url: userContext.currentCourseUrl,

      completed_phases: userContext.completedPhases || [],
      completed_topics: userContext.completedTopics || [],

      overall_progress_percent: userContext.overallProgressPercent || 0,

      strong_topics: userContext.strongTopics || [],
      weak_topics: userContext.weakTopics || [],

      hours_per_day: userContext.hoursPerDay || 0,
      hours_studied_this_week: userContext.hoursStudiedThisWeek || 0,
      total_hours_studied: userContext.totalHoursStudied || 0,

      last_activity: userContext.lastActivity,
    };

  let aiResponse;

  try {
    const response = await axios.post(
      process.env.AI_BASE_URL + "/ai/chat",
      {
        message,
        user_context: formattedContext,
        chat_history: chatHistory,
      },
    );

    aiResponse = response.data?.data;
    //console.log("AI RESPONSE:", aiResponse);
  } catch (err) {
      const aiError = err.response?.data;

      console.error("AI ERROR:", aiError || err.message);

      return res.status(503).json({
        message: "AI service temporarily unavailable",
        ai_error: aiError || null,
      });
    }

  /* ================= SAVE AI MESSAGE ================= */

  await ChatMessage.create({
    user: userId,
    role: "assistant",
    content: aiResponse.message,
  });

  /* ================= UPDATE USER CONTEXT ================= */

  if (aiResponse.updated_user_context) {
    Object.assign(userContext, aiResponse.updated_user_context);
    userContext.lastActivity = new Date();
    await userContext.save();
  }

  /* ================= SMART PROGRESS UPDATE ================= */

  const topic = detectTopic(message);
  const weak = isWeakSignal(message);

  if (topic) {
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

      if (weak && !progress.weakTopics.includes(topic)) {
        progress.weakTopics.push(topic);
        userContext.weakTopics = progress.weakTopics;
        await userContext.save();
      } else if (!weak && !progress.strongTopics.includes(topic)) {
        progress.strongTopics.push(topic);
        userContext.strongTopics = progress.strongTopics;
        await userContext.save();
      }

      await progress.save();
    }
  }

  /* ================= RESPONSE ================= */

  res.status(200).json({
    status: "success",
    message: aiResponse.message,
    type: aiResponse.type,
    data: aiResponse.data,
  });
});

exports.getChatHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const messages = await ChatMessage.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.status(200).json({
    status: "success",
    data: messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt,
    })),
  });
});