const admin = require("../fireBase/admin");
const User = require("../models/userModel");
const Notification = require("../models/notificationModel");
const { decryptToken } = require("../utils/fcmToken");

/* =========================================
   SEND NOTIFICATION FUNCTION
========================================= */
async function sendReminder(user, type) {

    let title;
    let body;

    if (type === "daily") {
      title = "Daily Momentum Alert";
      body = "Reminder: You're 30 mins behind today! Just 15 minutes of focus can keep your streak alive.";

    } else if (type === "milestone") {
      title = "New Milestone Reached";
      body = "Congratulations! You've hit a new milestone in your learning journey. Keep up the great work!";

    } else if (type === "streak") {
      title = "Streak Alert";
      body = "Your learning streak is in danger! Spend just 15 minutes today to keep it alive.";

    } else if (type === "progress") {
      title = "Progress Update";
      body = "Great job! You've made significant progress in your learning path. Keep pushing forward to reach your goals!";
    }

    const notification = await Notification.create({
        recipient: user._id,
        sendBy: null,
        type: type,
        title,
        message: body,
      });

    if (!user.fcmToken) { 
      console.warn(`No FCM token for user ${user._id}`);
      return;
    }
    const token = decryptToken(user.fcmToken);
    if (!token) {
      console.warn(`No valid FCM token for user ${user._id}`);
      return;
    }

    try {
      await admin.messaging().send({
        notification: { title, body },
        token
      });
    } catch (err) {
      console.error("Reminder send error:", err);
    }
  
}

/* =========================================
   DAILY REMINDER CRON
========================================= */
exports.startDailyReminderService = async(req, res) => {
    // runs every day at midnight
    try {
      const users = await User.find({ role: "user" });
        for (let user of users) {
        await sendReminder(user, "daily");
      }
    } catch (err) {
      console.error("Cron error:", err);
    }

    res.status(200).json({
        status: "success",
        message: "Daily reminder service started",
    });
};

