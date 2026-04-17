const asyncHandler = require("express-async-handler");
const UserContext = require("../models/userContextModel");

// @desc Create or Update User Context
// @route PUT /api/user-context
// @access Private
exports.upsertUserContext = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const {
    name,
    goal,
    field,
    level,
    hours_per_day,
  } = req.body;

  if (!name || !field || !level) {
    return res.status(400).json({
      message: "name, field and level are required",
    });
  }

  /* ================= CHECK EXISTING ================= */

  let userContext = await UserContext.findOne({ user: userId });

  if (!userContext) {
    /* ================= CREATE ================= */

    userContext = await UserContext.create({
      user: userId,
      name,
      goal,
      field,
      level,
      hoursPerDay: hours_per_day,
      startedAt: new Date(),
      stage: "assessment",
      lastActivity: new Date(),
    });
  } else {
    /* ================= UPDATE ================= */

    userContext.name = name || userContext.name;
    userContext.goal = goal || userContext.goal;
    userContext.field = field || userContext.field;
    userContext.level = level || userContext.level;
    userContext.hoursPerDay = hours_per_day || userContext.hoursPerDay;
    userContext.lastActivity = new Date();

    await userContext.save();
  }

  res.status(200).json({
    status: "success",
    data: userContext,
  });
});

exports.getUserContext = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const userContext = await UserContext.findOne({ user: userId });

  if (!userContext) {
    return res.status(404).json({
      message: "User context not found",
    });
  }

  res.status(200).json({
    status: "success",
    data: userContext,
  });
});