const mongoose = require("mongoose");

const contactUsSchema = new mongoose.Schema({

  firstName: {
    type: String,
    required: true,
  },

  lastName: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
  },

  subject: {
    type: String,
  },

  message: {
    type: String,
    required: true,
  },

  status: {
    type: String,

    enum: [
      "pending",
      "in_progress",
      "resolved",
      "closed",
    ],

    default: "pending",
  },

  adminReply: {
    type: String,
    default: null,
  },

  resolvedAt: {
    type: Date,
    default: null,
  },

  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

}, {
  timestamps: true,
});

module.exports = mongoose.model(
  "ContactUs",
  contactUsSchema
);