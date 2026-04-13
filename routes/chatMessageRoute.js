const express = require("express");
const router = express.Router();

const { sendMessage } = require("../services/chatMessageService");
const { protect , allowedTo} = require("../middleware/authMiddleware");

router.post("/send", protect,allowedTo("user"), sendMessage);

module.exports = router;