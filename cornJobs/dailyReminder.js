const admin =
  require("../fireBase/admin");

const User =
  require("../models/userModel");

const Notification =
  require("../models/notificationModel");

const {
  decryptToken,
} = require("../utils/fcmToken");

/* =========================================
   SEND REMINDER
========================================= */
const sendReminder =
  async (user, type) => {

    let title = "";
    let body = "";

    if (type === "DAILY_REMINDER") {

      title =
        "Daily Momentum Alert";

      body =
        "Reminder: You're 30 mins behind today! Just 15 minutes of focus can keep your streak alive.";

    }

    else if (
      type === "MILESTONE"
    ) {

      title =
        "New Milestone Reached";

      body =
        "Congratulations! You've hit a new milestone in your learning journey. Keep up the great work!";

    }

    else if (
      type === "STREAK"
    ) {

      title =
        "Streak Alert";

      body =
        "Your learning streak is in danger! Spend just 15 minutes today to keep it alive.";

    }

    else if (
      type === "PROGRESS"
    ) {

      title =
        "Progress Update";

      body =
        "Great job! You've made significant progress in your learning path. Keep pushing forward to reach your goals!";

    }

    // =========================
    // SAVE NOTIFICATION
    // =========================
    const notification =
      await Notification.create({

        recipient: user._id,

        sendBy: null,

        type,

        title,

        message: body,

      });

    // =========================
    // CHECK TOKEN
    // =========================
    if (!user.fcmToken) {

      console.warn(
        `No FCM token for user ${user._id}`
      );

      return notification;
    }

    const token =
      decryptToken(
        user.fcmToken
      );

    if (!token) {

      console.warn(
        `Invalid FCM token for user ${user._id}`
      );

      return notification;
    }

    // =========================
    // SEND PUSH
    // =========================
    try {

      await admin.messaging().send({

        token,

        notification: {
          title,
          body,
        },

      });

    } catch (err) {

      console.error(
        "Reminder send error:",
        err
      );

    }

    return notification;
};

/* =========================================
   DAILY REMINDER SERVICE
========================================= */
const startDailyReminderService =
  async (req, res) => {

    try {

      const users =
        await User.find({
          role: "user",
        });

      for (let user of users) {

        await sendReminder(
          user,
          "DAILY_REMINDER"
        );

      }

    } catch (err) {

      console.error(
        "Cron error:",
        err
      );

    }

    res.status(200).json({

      status: "success",

      message:
        "Daily reminder service started",

    });
};

module.exports = {
  sendReminder,
  startDailyReminderService,
};