const express = require("express");
const router = express.Router();

const { sendMessage ,getChatHistory } = require("../services/chatMessageService");
const { protect , allowedTo} = require("../middleware/authMiddleware");

router.post("/send", protect,allowedTo("user"), sendMessage);
router.get("/history", protect,allowedTo("user"), getChatHistory);

module.exports = router;