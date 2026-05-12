const express = require("express");
const router  = express.Router();

const { protect, allowedTo } = require("../middleware/authMiddleware");

const {
  // Dashboard
  getDashboardStats,

  // Users
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getUserProfile,

  // Contact Us
  getAllContactMessages,
  getContactMessageById,
  deleteContactMessage,

  // Quizzes
  getAllQuizAttempts,
  getQuizAttemptById,
  deleteQuizAttempt,
  getQuizStats,
  getQuizAnalytics
} = require("../services/adminService");

// All admin routes require authentication + admin role
router.use(protect, allowedTo("admin"));

// ==============================
//  DASHBOARD
// ==============================
router.get("/stats", getDashboardStats);

// ==============================
//  USER MANAGEMENT
// ==============================
router.get   ("/users",              getAllUsers);
router.get   ("/users/:id",          getUserById);
router.get   ("/users/:id/profile",  getUserProfile);
router.patch ("/users/:id/status",   updateUserStatus);
router.patch ("/users/:id/role",     updateUserRole);
router.delete("/users/:id",          deleteUser);

// ==============================
//  CONTACT US
// ==============================
router.get   ("/contact",     getAllContactMessages);
router.get   ("/contact/:id", getContactMessageById);
router.delete("/contact/:id", deleteContactMessage);

// ==============================
//  QUIZZES
// ==============================
router.get   ("/quizzes",       getAllQuizAttempts);
router.get   ("/quizzes/stats", getQuizStats);
router.get   ("/quizzes/:id",   getQuizAttemptById);
router.get   ("/quizzes/quiz-analytics", getQuizAnalytics);
router.delete("/quizzes/:id",   deleteQuizAttempt);

module.exports = router;
