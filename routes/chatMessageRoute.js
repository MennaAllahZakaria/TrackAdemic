const express = require("express");
const router = express.Router();

const { sendMessage ,getChatHistory } = require("../services/chatMessageService");
const { protect , allowedTo} = require("../middleware/authMiddleware");

const { updateStreak }= require("../services/authService")

router.post("/send", protect,allowedTo("user"),updateStreak, sendMessage);
router.get("/history", protect,allowedTo("user"), getChatHistory);

module.exports = router;