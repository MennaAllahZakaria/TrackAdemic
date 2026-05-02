const express = require("express");
const router = express.Router();

const {
  upsertUserContext,
  getUserContext,
} = require("../services/userContextService");

const { protect , allowedTo} = require("../middleware/authMiddleware");
const { updateStreak }= require("../services/authService")

router.put("/", protect,updateStreak, upsertUserContext);
router.get("/", protect, getUserContext);

module.exports = router;