const asyncHandler = require("express-async-handler");
const Track = require("../models/trackModel");
const ApiError = require("../utils/apiError");

exports.createTrack = asyncHandler(async (req, res) => {
    const { title, description, totalHours, totalModules, category } = req.body;

      if (!req.files?.trackImage) {
        return (new ApiError("No image file uploaded", 400));
      }

    if (!title || !description) {
        return res.status(400).json({
            message: "title and description are required",
        });
    }

    const track = await Track.create({
        title,
        description,
        trackImage : req.trackImageUrl,
        totalHours,
        totalModules,
        category,
    });

    res.status(201).json({
        status: "success",
        data: track,
    });
});

exports.getAllTracks = asyncHandler(async (req, res) => {
    const tracks = await Track.find();
    res.status(200).json({
        status: "success",
        results: tracks.length,
        data: tracks,
    });
});

exports.getTrackById = asyncHandler(async (req, res) => {
    const track = await Track.findById(req.params.id);
    if (!track) {
        return res.status(404).json({
            message: "Track not found",
        });
    }   
    res.status(200).json({
        status: "success",
        data: track,
    });
});
