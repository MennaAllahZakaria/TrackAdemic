const asyncHandler = require("express-async-handler");

const User             = require("../models/userModel");
const Track            = require("../models/trackModel");
const LearningPath     = require("../models/learningPathModel");
const Progress         = require("../models/progressModel");
const ContactUs        = require("../models/contactUsModel");
const Quiz             = require("../models/questionModel");
const QuizAttempt      = require("../models/quizModel");
const AssessmentSession = require("../models/assessmentSessionModel");
const Notification     = require("../models/notificationModel");
const ApiError         = require("../utils/apiError");
const sendEmail        = require("../utils/sendEmail");
const bcrypt           = require("bcryptjs");
const generatePassword = require("../utils/generatePassword");

// ============================================================
//  HELPER — build pagination meta
// ============================================================
const paginate = (page, limit, total) => ({
  currentPage : Number(page),
  limit       : Number(limit),
  totalPages  : Math.ceil(total / limit),
  totalItems  : total,
  ...(page * limit < total && { next: Number(page) + 1 }),
  ...(page > 1             && { prev: Number(page) - 1 }),
});


// ============================================================
//  DASHBOARD OVERVIEW
// ============================================================

// @desc    Get dashboard overview stats
// @route   GET /admin/stats
// @access  Private/admin
exports.getDashboardStats = asyncHandler(async (req, res) => {

  const [
    totalUsers,
    activeUsers,
    bannedUsers,
    totalTracks,
    totalLearningPaths,
    totalQuizAttempts,
    totalContactMessages,
    totalNotifications,
    topStreaks,
    recentUsers,
    quizAvgData,
  ] = await Promise.all([
    // Users
    User.countDocuments(),
    User.countDocuments({ status: "active" }),
    User.countDocuments({ status: "banned" }),

    // Content
    Track.countDocuments(),
    LearningPath.countDocuments({ isActive: true }),

    // Activity
    QuizAttempt.countDocuments(),
    ContactUs.countDocuments(),
    Notification.countDocuments(),

    // Top 5 users by streak
    User.find()
      .sort({ "streak.count": -1 })
      .limit(5)
      .select("firstName lastName email streak.count streak.longest imageProfile"),

    // Last 5 registered users
    User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("firstName lastName email status createdAt imageProfile"),

    // Avg quiz score
    QuizAttempt.aggregate([
      { $group: { _id: null, avgScore: { $avg: "$percentage" } } },
    ]),
  ]);

  res.status(200).json({
    status : "success",
    data   : {
      users: {
        total  : totalUsers,
        active : activeUsers,
        banned : bannedUsers,
        inactive: totalUsers - activeUsers - bannedUsers,
      },
      content: {
        tracks        : totalTracks,
        learningPaths : totalLearningPaths,
      },
      activity: {
        quizAttempts    : totalQuizAttempts,
        avgQuizScore    : quizAvgData[0]?.avgScore
                            ? Math.round(quizAvgData[0].avgScore)
                            : 0,
        contactMessages : totalContactMessages,
        notifications   : totalNotifications,
      },
      topStreaks  : topStreaks,
      recentUsers : recentUsers,
    },
  });
});


// ============================================================
//  USER MANAGEMENT
// ============================================================

// @desc    Get all users with filtering, search, sorting, pagination
// @route   GET /admin/users
// @access  Private/admin
exports.getAllUsers = asyncHandler(async (req, res) => {
  const {
    page    = 1,
    limit   = 10,
    status,
    role,
    keyword,
    sort    = "-createdAt",
  } = req.query;

  const filter = {};
  if (status)  filter.status = status;
  if (role)    filter.role   = role;
  if (keyword) {
    filter.$or = [
      { firstName : { $regex: keyword, $options: "i" } },
      { lastName  : { $regex: keyword, $options: "i" } },
      { email     : { $regex: keyword, $options: "i" } },
    ];
  }

  const skip  = (page - 1) * limit;
  const total = await User.countDocuments(filter);

  const users = await User.find(filter)
    .sort(sort.split(",").join(" "))
    .skip(skip)
    .limit(Number(limit))
    .select("-password -passwordResetCode -passwordResetExpires -passwordResetVerified -fcmToken -googleId -__v");

  res.status(200).json({
    status          : "success",
    paginationResult: paginate(page, limit, total),
    results         : users.length,
    data            : users,
  });
});


// @desc    Get single user by ID
// @route   GET /admin/users/:id
// @access  Private/admin
exports.getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select("-password -passwordResetCode -passwordResetExpires -passwordResetVerified -fcmToken -googleId -__v");

  if (!user) return next(new ApiError("No user found with this ID", 404));

  res.status(200).json({ status: "success", data: user });
});


// @desc    Update user status (active / inactive / banned)
// @route   PATCH /admin/users/:id/status
// @access  Private/admin
exports.updateUserStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  const allowed = ["active", "inactive", "banned"];
  if (!status || !allowed.includes(status)) {
    return next(new ApiError(`status must be one of: ${allowed.join(", ")}`, 400));
  }

  // Prevent admin from banning themselves
  if (req.params.id === req.user._id.toString()) {
    return next(new ApiError("You cannot change your own status", 400));
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  ).select("-password -passwordResetCode -passwordResetExpires -passwordResetVerified -fcmToken -googleId -__v");

  if (!user) return next(new ApiError("No user found with this ID", 404));

  res.status(200).json({
    status : "success",
    message: `User status updated to "${status}" successfully`,
    data   : user,
  });
});


// @desc    Change user role (user / admin)
// @route   PATCH /admin/users/:id/role
// @access  Private/admin
exports.updateUserRole = asyncHandler(async (req, res, next) => {
  const { role } = req.body;

  const allowed = ["user", "admin"];
  if (!role || !allowed.includes(role)) {
    return next(new ApiError(`role must be one of: ${allowed.join(", ")}`, 400));
  }

  if (req.params.id === req.user._id.toString()) {
    return next(new ApiError("You cannot change your own role", 400));
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true }
  ).select("-password -passwordResetCode -passwordResetExpires -passwordResetVerified -fcmToken -googleId -__v");

  if (!user) return next(new ApiError("No user found with this ID", 404));

  res.status(200).json({
    status : "success",
    message: `User role updated to "${role}" successfully`,
    data   : user,
  });
});


// @desc    Delete user permanently
// @route   DELETE /admin/users/:id
// @access  Private/admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  if (req.params.id === req.user._id.toString()) {
    return next(new ApiError("You cannot delete your own account", 400));
  }

  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return next(new ApiError("No user found with this ID", 404));

  res.status(200).json({
    status : "success",
    message: "User deleted successfully",
  });
});


// @desc    Get full profile of a user (with progress & learning path)
// @route   GET /admin/users/:id/profile
// @access  Private/admin
exports.getUserProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select("-password -passwordResetCode -passwordResetExpires -passwordResetVerified -fcmToken -googleId -__v");

  if (!user) return next(new ApiError("No user found with this ID", 404));

  const [progress, learningPath, quizCount] = await Promise.all([
    Progress.findOne({ user: req.params.id }),
    LearningPath.findOne({ user: req.params.id, isActive: true })
      .select("meta generatedFrom isActive createdAt"),
    QuizAttempt.countDocuments({ user: req.params.id }),
  ]);

  res.status(200).json({
    status: "success",
    data  : {
      user,
      progress    : progress  || null,
      learningPath: learningPath || null,
      quizCount,
    },
  });
});

exports.createUserByAdmin = asyncHandler(async (req,res,next) => {
    const {
      firstName,
      lastName,
      email,
      role = "user",
    } = req.body;

    // =========================
    // VALIDATION
    // =========================
    if (!firstName || !lastName ||!email) {
      return next(new ApiError("All fields are required",400));
    }

    // =========================
    // CHECK EXISTING USER
    // =========================
    const existingUser =await User.findOne({email,});

    if (existingUser) {
      return next(new ApiError("User already exists",400));
    }

    // =========================
    // GENERATE PASSWORD
    // =========================
    const generatedPassword =generatePassword();

    // =========================
    // HASH PASSWORD
    // =========================
    const hashedPassword = await bcrypt.hash(generatedPassword,12);

    // =========================
    // CREATE USER
    // =========================
    const user = await User.create({
        firstName,
        lastName,
        email,
        role,
        password:hashedPassword,
      });

    // =========================
    // SEND EMAIL
    // =========================
    try {

      await sendEmail({
        Email: email,
        subject: "Your Trackademic Account",
        message: ` Hello ${firstName},
                    Your account has been created successfully.
                    Login Credentials:
                    Email:
                    ${email}
                    Password:
                    ${generatedPassword}
                    Please change your password after logging in.
                    Trackademic Team`,
  });

    } catch (err) {

      console.error(
        "Email send error:",
        err
      );

    }

    // =========================
    // RESPONSE
    // =========================
    res.status(201).json({
      status: "success",
      message:"User created successfully",
    });

});

// ============================================================
//  CONTACT US
// ============================================================

// @desc    Get all contact messages with pagination & filtering
// @route   GET /admin/contact
// @access  Private/admin
exports.getAllContactMessages = asyncHandler(async (req, res) => {
  const {
    page    = 1,
    limit   = 10,
    keyword,
    sort    = "-createdAt",
  } = req.query;

  const filter = {};
  if (keyword) {
    filter.$or = [
      { firstName : { $regex: keyword, $options: "i" } },
      { lastName  : { $regex: keyword, $options: "i" } },
      { email     : { $regex: keyword, $options: "i" } },
      { subject   : { $regex: keyword, $options: "i" } },
      { message   : { $regex: keyword, $options: "i" } },
    ];
  }

  const skip  = (page - 1) * limit;
  const total = await ContactUs.countDocuments(filter);

  const messages = await ContactUs.find(filter)
    .sort(sort.split(",").join(" "))
    .skip(skip)
    .limit(Number(limit));

  res.status(200).json({
    status          : "success",
    paginationResult: paginate(page, limit, total),
    results         : messages.length,
    data            : messages,
  });
});


// @desc    Get single contact message by ID
// @route   GET /admin/contact/:id
// @access  Private/admin
exports.getContactMessageById = asyncHandler(async (req, res, next) => {
  const message = await ContactUs.findById(req.params.id);
  if (!message) return next(new ApiError("No message found with this ID", 404));

  res.status(200).json({ status: "success", data: message });
});


// @desc    Delete contact message
// @route   DELETE /admin/contact/:id
// @access  Private/admin
exports.deleteContactMessage = asyncHandler(async (req, res, next) => {
  const message = await ContactUs.findByIdAndDelete(req.params.id);
  if (!message) return next(new ApiError("No message found with this ID", 404));

  res.status(200).json({
    status : "success",
    message: "Contact message deleted successfully",
  });
});


// ============================================================
//  QUIZZES
// ============================================================

// @desc    Get all quiz attempts with filters
// @route   GET /admin/quizzes
// @access  Private/admin
exports.getAllQuizAttempts = asyncHandler(async (req, res) => {
  const {
    page      = 1,
    limit     = 10,
    topic,
    userId,
    sort      = "-createdAt",
  } = req.query;

  const filter = {};
  if (topic)  filter.topic = { $regex: topic, $options: "i" };
  if (userId) filter.user  = userId;

  const skip  = (page - 1) * limit;
  const total = await QuizAttempt.countDocuments(filter);

  const attempts = await QuizAttempt.find(filter)
    .populate("user", "firstName lastName email imageProfile")
    .sort(sort.split(",").join(" "))
    .skip(skip)
    .limit(Number(limit))
    .select("-answers");

  res.status(200).json({
    status          : "success",
    paginationResult: paginate(page, limit, total),
    results         : attempts.length,
    data            : attempts,
  });
});


// @desc    Get quiz attempt details by ID
// @route   GET /admin/quizzes/:id
// @access  Private/admin
exports.getQuizAttemptById = asyncHandler(async (req, res, next) => {
  const attempt = await QuizAttempt.findById(req.params.id)
    .populate("user", "firstName lastName email imageProfile");

  if (!attempt) return next(new ApiError("No quiz attempt found with this ID", 404));

  res.status(200).json({ status: "success", data: attempt });
});


// @desc    Delete a quiz attempt
// @route   DELETE /admin/quizzes/:id
// @access  Private/admin
exports.deleteQuizAttempt = asyncHandler(async (req, res, next) => {
  const attempt = await QuizAttempt.findByIdAndDelete(req.params.id);
  if (!attempt) return next(new ApiError("No quiz attempt found with this ID", 404));

  res.status(200).json({
    status : "success",
    message: "Quiz attempt deleted successfully",
  });
});


// @desc    Get quiz stats (top topics, avg score, pass rate)
// @route   GET /admin/quizzes/stats
// @access  Private/admin
exports.getQuizStats = asyncHandler(async (req, res) => {
  const [generalStats, topTopics, scoreDistribution] = await Promise.all([

    // General: total, avg score, pass rate (>= 50)
    QuizAttempt.aggregate([
      {
        $group: {
          _id      : null,
          total    : { $sum: 1 },
          avgScore : { $avg: "$percentage" },
          passed   : { $sum: { $cond: [{ $gte: ["$percentage", 50] }, 1, 0] } },
        },
      },
    ]),

    // Top 5 attempted topics
    QuizAttempt.aggregate([
      { $group: { _id: "$topic", count: { $sum: 1 }, avgScore: { $avg: "$percentage" } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { topic: "$_id", count: 1, avgScore: { $round: ["$avgScore", 1] }, _id: 0 } },
    ]),

    // Score distribution buckets (0-20, 20-40, 40-60, 60-80, 80-100)
    QuizAttempt.aggregate([
      {
        $bucket: {
          groupBy   : "$percentage",
          boundaries: [0, 20, 40, 60, 80, 100],
          default   : "100",
          output    : { count: { $sum: 1 } },
        },
      },
    ]),
  ]);

  const g = generalStats[0] || { total: 0, avgScore: 0, passed: 0 };

  res.status(200).json({
    status: "success",
    data  : {
      total       : g.total,
      avgScore    : Math.round(g.avgScore || 0),
      passRate    : g.total ? Math.round((g.passed / g.total) * 100) : 0,
      topTopics,
      scoreDistribution,
    },
  });
});

exports.getQuizAnalytics = asyncHandler(async (req, res) => {

  const [
    overview,
    topTopics,
    dailyAttempts,
    avgScorePerTopic,
    hardestTopics,
    latestAttempts,
  ] = await Promise.all([

    // =========================
    // OVERVIEW
    // =========================
    QuizAttempt.aggregate([
      {
        $group: {
          _id: null,

          totalAttempts: {
            $sum: 1,
          },

          avgScore: {
            $avg: "$percentage",
          },

          highestScore: {
            $max: "$percentage",
          },

          lowestScore: {
            $min: "$percentage",
          },

          passedCount: {
            $sum: {
              $cond: [
                { $gte: ["$percentage", 50] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),

    // =========================
    // TOP TOPICS
    // =========================
    QuizAttempt.aggregate([
      {
        $group: {
          _id: "$topic",

          attempts: {
            $sum: 1,
          },

          avgScore: {
            $avg: "$percentage",
          },
        },
      },

      {
        $sort: {
          attempts: -1,
        },
      },

      {
        $limit: 5,
      },

      {
        $project: {
          _id: 0,
          topic: "$_id",
          attempts: 1,
          avgScore: {
            $round: ["$avgScore", 1],
          },
        },
      },
    ]),

    // =========================
    // ATTEMPTS PER DAY
    // =========================
    QuizAttempt.aggregate([
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },

          attempts: {
            $sum: 1,
          },
        },
      },

      {
        $sort: {
          _id: 1,
        },
      },
    ]),

    // =========================
    // AVG SCORE PER TOPIC
    // =========================
    QuizAttempt.aggregate([
      {
        $group: {
          _id: "$topic",

          avgScore: {
            $avg: "$percentage",
          },

          totalAttempts: {
            $sum: 1,
          },
        },
      },

      {
        $sort: {
          avgScore: -1,
        },
      },

      {
        $project: {
          _id: 0,
          topic: "$_id",
          avgScore: {
            $round: ["$avgScore", 1],
          },
          totalAttempts: 1,
        },
      },
    ]),

    // =========================
    // HARDEST TOPICS
    // =========================
    QuizAttempt.aggregate([
      {
        $group: {
          _id: "$topic",

          avgScore: {
            $avg: "$percentage",
          },

          attempts: {
            $sum: 1,
          },
        },
      },

      {
        $match: {
          attempts: {
            $gte: 3,
          },
        },
      },

      {
        $sort: {
          avgScore: 1,
        },
      },

      {
        $limit: 5,
      },

      {
        $project: {
          _id: 0,
          topic: "$_id",
          avgScore: {
            $round: ["$avgScore", 1],
          },
          attempts: 1,
        },
      },
    ]),

    // =========================
    // LATEST ATTEMPTS
    // =========================
    QuizAttempt.find()
      .populate("user", "firstName lastName email imageProfile")
      .sort("-createdAt")
      .limit(10)
      .select("topic percentage score total createdAt user"),
  ]);


  const stats = overview[0] || {
    totalAttempts: 0,
    avgScore: 0,
    highestScore: 0,
    lowestScore: 0,
    passedCount: 0,
  };

  res.status(200).json({
    status: "success",

    data: {

      overview: {
        totalAttempts: stats.totalAttempts,

        avgScore: Math.round(stats.avgScore || 0),

        highestScore: stats.highestScore,

        lowestScore: stats.lowestScore,

        successRate:
          stats.totalAttempts > 0
            ? Math.round(
                (stats.passedCount / stats.totalAttempts) * 100
              )
            : 0,
      },

      topTopics,

      dailyAttempts,

      avgScorePerTopic,

      hardestTopics,

      latestAttempts,
    },
  });
});