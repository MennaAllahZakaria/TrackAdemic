const express = require("express");
const router = express.Router();

const {
    updateProgress,
    getMyProgress
} = require("../services/progressService");

const { protect , allowedTo} = require("../middleware/authMiddleware");
const { updateStreak }= require("../services/authService")


router.post("/update", protect, allowedTo("user"),updateStreak, updateProgress);
router.get("/me", protect, allowedTo("user"), getMyProgress);

module.exports = router;