const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatMessage", chatMessageSchema);