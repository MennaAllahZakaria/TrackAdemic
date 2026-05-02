const mongoose = require("mongoose");

const trackSchema = new mongoose.Schema({

    title:{
        type: String,
        required: [true, "title required"],
    },
    description: {
        type: String,
        required: [true, "description required"],
        minlength: [10, "too short description"],
        maxlength: [500, "too long description"],
    },
    trackImage: {
        type: String
    },
    category: {
        type: String,
    },
    totalHours: {
        type: Number
    },
    totalModules: {
        type: Number
    },
    level:{
        type: String,
        enum: ["Beginner", "Intermediate", "Advanced"],
    }


},{timestamps: true});

module.exports = mongoose.model("Track", trackSchema);