const mongoose = require("mongoose");

const verificationSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
    },
    code: {
        type: String, //  Hashed
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    type: {
        type: String,
        enum: ["emailVerification", "passwordReset"],
        required: true,
    },
    tempUserData: {
        type: Object, // if type = emailVerification
    },
    verified: {
        type: Boolean,
        default: false,
    },
    }, {
    timestamps: true,
});

module.exports = mongoose.model("Verification", verificationSchema);
