const express = require("express");
const router = express.Router();

const {
    generateQuiz,
    submitQuiz,
    getMyQuizzes,
    getQuizById,
    getAllQuizzes,
} = require("../services/quizService");

const { protect , allowedTo} = require("../middleware/authMiddleware");

const { updateStreak }= require("../services/authService")

router.post("/generate", protect, allowedTo("user"),updateStreak, generateQuiz);
router.post("/submit", protect, allowedTo("user"),updateStreak, submitQuiz);

router.get("/my", protect, allowedTo("user"), getMyQuizzes);
router.get("/:id", protect, allowedTo("user"), getQuizById);

// admin
router.get(
  "/admin/all",
  protect,
  allowedTo("admin"),
  getAllQuizzes
);

module.exports = router;