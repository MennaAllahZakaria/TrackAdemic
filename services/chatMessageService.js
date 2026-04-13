const asyncHandler = require("express-async-handler");
const axios = require("axios");
const ChatMessage = require("../models/chatMessageModel");

/* ================= HELPER ================= */
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

/* ================= CONTROLLER ================= */

exports.sendMessage = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const { message, user_context } = req.body;

  if (!message || !user_context) {
    return res.status(400).json({
      message: "message and user_context are required",
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

  let aiResponse;

  try {
    const response = await axios.post(
      process.env.AI_BASE_URL + "/ai/chat",
      {
        message,
        user_context,
        chat_history: chatHistory,
      },
      { timeout: 8000 }
    );

    aiResponse = response.data?.data;
  } catch (err) {
    return res.status(500).json({
      message: "AI service failed",
    });
  }

  if (!aiResponse) {
    return res.status(500).json({
      message: "Invalid AI response",
    });
  }

  /* ================= SAVE AI MESSAGE ================= */

  await ChatMessage.create({
    user: userId,
    role: "assistant",
    content: aiResponse.message,
  });

  /* ================= RESPONSE ================= */

  res.status(200).json({
    status: "success",
    message: aiResponse.message,
    type: aiResponse.type,
    data: aiResponse.data,
    updated_user_context: aiResponse.updated_user_context || null,
  });
});