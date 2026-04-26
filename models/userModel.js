const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, "firstName required"],
    },
    lastName: {
        type: String,
        required: [true, "lastName required"],
    },
    email: {
        type: String,
        unique: true,
        required: [true, "email required"],
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        //required: [true, "password required"],
        minlength: [8, "too short password"],
    },

    passwordChangedAt: Date,
    passwordResetCode: String,
    passwordResetExpires: Date,
    passwordResetVerified: Boolean,
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user",
    },

    status: {
        type: String,
        default: "active",
        enum: ["active", "inactive", "banned"],
    },

    imageProfile: {
        type: String,
        default: null,
    },
    fcmToken: {
        type: String,
        default: null,
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true,
    },

},{
    timestamps: true,
});


// Remove sensitive fields when converting to JSON
userSchema.set("toJSON", {
  transform: function (doc, ret) {
    delete ret.password;
    delete ret.__v;
    delete ret.passwordResetCode;
    delete ret.passwordResetExpires;
    delete ret.passwordResetVerified;
    return ret;
  },
});


const User = mongoose.model("User", userSchema);
module.exports = User;