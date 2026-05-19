const asyncHandler = require("express-async-handler");

const ApiError = require("../utils/apiError");

const Notification = require('../models/notificationModel');
const User = require("../models/userModel");

const HandlerFactory = require("./handlerFactory");

// @desc    Get all notifications of logged user
// @route   GET /notifications/all
// @access  Private/user

exports.getNotifications = asyncHandler(async (req, res, next) => {

  let filter = {};

  // user => only his notifications
  if (req.user.role === "user") {
    filter.recipient = req.user.id;
  }

  // =========================
  // TODAY DATE RANGE
  // =========================
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);

  const endToday = new Date();
  endToday.setHours(23, 59, 59, 999);

  // =========================
  // GET DATA IN PARALLEL
  // =========================
  const [
    notifications,
    unreadCount,
    todayCount,
    totalCount,
  ] = await Promise.all([

    Notification.find(filter)
      .sort({ createdAt: -1 })
      .populate("recipient", "firstName lastName email")
      .populate("sendBy", "firstName lastName email"),

    // unread notifications
    Notification.countDocuments({
      ...filter,
      read: false,
    }),

    // today's notifications
    Notification.countDocuments({
      ...filter,
      createdAt: {
        $gte: startToday,
        $lte: endToday,
      },
    }),

    // total notifications
    Notification.countDocuments(filter),
  ]);

  if (!notifications.length) {
    return next(
      new ApiError("No notifications found", 404)
    );
  }

  res.status(200).json({
    status: "success",

    results: notifications.length,

    analytics: {
      total: totalCount,
      unread: unreadCount,
      today: todayCount,
    },

    data: notifications,
  });
});
// @desc    Get notification of logged user by id
// @route   GET /notifications/:id
// @access  Private/user

exports.getNotificationById = asyncHandler(async (req, res, next) => {
    const notification = await Notification.findById(req.params.id)
                                            .populate("recipient", "firstName lastName email")
                                            .populate("sendBy", "firstName lastName email");
    
    if (!notification) {
      return next(
        new ApiError(
          "No notification found with this ID",
          404
        )
      );
    }

    if (
      req.user.role === "user" &&
      req.user.id.toString() !== notification.recipient._id.toString()
    ) {
      return next(
        new ApiError(
          "You are not authorized to access this notification",
          403
        )
      );
    }

    if (!notification) {
        return next(new ApiError("No notification found with this ID", 404));
    }

    res.status(200).json({ data: notification });
});

// @desc    Mark notification as read
// @route   PUT /notifications/read/:id
// @access  Private/user

exports.markNotificationAsRead = asyncHandler(async (req, res, next) => {

  const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return next(
        new ApiError(
          "No notification found with this ID",
          404
        )
      );
    }

    if (
      req.user.role === "user" &&
      notification.recipient.toString() !== req.user.id
    ) {
      return next(
        new ApiError(
          "Not authorized",
          403
        )
      );
    }

    notification.read = true;

    await notification.save();

    res.status(200).json({
      status: "success",
      data: notification,
    });
  }
);

// @desc    Delete notification
// @route   DELETE /notifications/:id
// @access  Private/user

exports.deleteNotification = HandlerFactory.deleteOne(Notification);

// @desc    Delete all notification of logged user
// @route   DELETE /notifications/all
// @access  Private/user

exports.deleteAllNotifications = asyncHandler(async (req, res, next) => {
    await Notification.deleteMany({ recipient: req.user.id });

    res.status(204).json({ msg: "Deleted" });
});


// @desc    add notification from admin
// @route   POST /notifications
// @access  Private/admin

exports.addNotification = asyncHandler(
  async (req, res, next) => {

    let {
      title,
      message,
      type = "GENERAL",
      userEmail,
      sendToAll = false,
    } = req.body;

    // =========================
    // VALIDATION
    // =========================
    if (!title || !message) {
      return next(
        new ApiError(
          "Title and message are required",
          400
        )
      );
    }

    // if no email => send to all
    if (!userEmail) {
      sendToAll = true;
    }

    // =========================
    // SEND TO ALL USERS
    // =========================
    if (sendToAll) {

      const users = await User.find({
        role: "user",
      }).select("_id");

      if (!users.length) {
        return next(
          new ApiError(
            "No users found",
            404
          )
        );
      }

      const notifications = users.map(
        (user) => ({
          title,
          message,
          type,
          recipient: user._id,
          sendBy: req.user._id,
        })
      );

      await Notification.insertMany(
        notifications
      );

      return res.status(201).json({
        status: "success",
        message:
          "Notification sent to all users",
        totalUsers: users.length,
      });
    }

    // =========================
    // SEND TO SINGLE USER
    // =========================
    const recipient = await User.findOne({
      email: userEmail,
    });

    if (!recipient) {
      return next(
        new ApiError(
          "User not found",
          404
        )
      );
    }

    const notification =
      await Notification.create({
        title,
        message,
        type,
        recipient: recipient._id,
        sendBy: req.user._id,
      });

    res.status(201).json({
      status: "success",
      data: notification,
    });
  }
);