const express = require("express");
const router = express.Router();

const {
    startAssessment,
    answerAssessment
} = require("../services/assessmentService");

const { protect , allowedTo} = require("../middleware/authMiddleware");

router.post("/start", protect, allowedTo("user"), startAssessment);
router.post("/answer", protect, allowedTo("user"), answerAssessment);

module.exports = router;