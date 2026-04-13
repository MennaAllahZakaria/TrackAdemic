const express = require("express");
const router = express.Router();

const {
    generateQuiz,
    submitQuiz
} = require("../services/quizService");

const { protect , allowedTo} = require("../middleware/authMiddleware");

router.post("/generate", protect, allowedTo("user"), generateQuiz);
router.post("/submit", protect, allowedTo("user"), submitQuiz);

module.exports = router;