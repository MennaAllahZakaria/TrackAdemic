const express = require("express");
const router = express.Router();

const {
  upsertUserContext,
  getUserContext,
} = require("../services/userContextService");

const { protect , allowedTo} = require("../middleware/authMiddleware");

router.put("/", protect, upsertUserContext);
router.get("/", protect, getUserContext);

module.exports = router;