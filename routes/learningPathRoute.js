const express = require("express");
const router = express.Router();
const {
  generateLearningPath,
  getMyLearningPath,
  regenerateLearningPath,
} = require("../services/learningPathService");

const { protect , allowedTo} = require("../middleware/authMiddleware");

router.post("/generate", protect,allowedTo("user"), generateLearningPath);
router.get("/me", protect,allowedTo("user"), getMyLearningPath);
router.post("/regenerate", protect, allowedTo("user"), regenerateLearningPath);

module.exports = router;