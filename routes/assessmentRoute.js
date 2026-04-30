const express = require("express");
const router = express.Router();

const {
    startAssessment,
    answerAssessment,
    getActiveSession,
    getAssessmentsResult
} = require("../services/assessmentService");

const { protect , allowedTo} = require("../middleware/authMiddleware");

router.post("/start", protect, allowedTo("user"), startAssessment);
router.post("/answer", protect, allowedTo("user"), answerAssessment);

router.get("/active", protect, allowedTo("user"), getActiveSession);
router.get("/result", protect, allowedTo("user"), getAssessmentsResult);

module.exports = router;