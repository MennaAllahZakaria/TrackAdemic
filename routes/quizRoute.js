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

router.post("/generate", protect, allowedTo("user"), generateQuiz);
router.post("/submit", protect, allowedTo("user"), submitQuiz);

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