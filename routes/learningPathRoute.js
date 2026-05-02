const express = require("express");
const router = express.Router();
const {
  generateLearningPath,
  getMyLearningPath,
  regenerateLearningPath,
} = require("../services/learningPathService");

const { protect , allowedTo} = require("../middleware/authMiddleware");

const { updateStreak }= require("../services/authService")

router.post("/generate", protect,allowedTo("user"),updateStreak, generateLearningPath);
router.get("/me", protect,allowedTo("user"), getMyLearningPath);
router.post("/regenerate", protect, allowedTo("user"),updateStreak, regenerateLearningPath);

module.exports = router;