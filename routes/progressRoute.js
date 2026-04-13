const express = require("express");
const router = express.Router();

const {
    updateProgress,
    getMyProgress
} = require("../services/progressService");

const { protect , allowedTo} = require("../middleware/authMiddleware");

router.post("/update", protect, allowedTo("user"), updateProgress);
router.get("/me", protect, allowedTo("user"), getMyProgress);

module.exports = router;