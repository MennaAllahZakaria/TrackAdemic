const asyncHandler = require("express-async-handler");
const Track = require("../models/trackModel");
const ApiError = require("../utils/apiError");
const HandlerFactory = require("./handlerFactory")

const LearningPath = require("../models/learningPathModel");
const User = require("../models/userModel");

exports.createTrack = asyncHandler(async (req, res) => {
    const { title, description, totalHours, totalModules, category , level} = req.body;

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
        level,
    });

    res.status(201).json({
        status: "success",
        data: track,
    });
});

exports.getAllTracks = asyncHandler(
  async (req, res) => {

    // ================= FILTERING =================

    let queryObj = {
      ...req.query,
    };

    const excludedFields = [
      "page",
      "sort",
      "limit",
      "fields",
    ];

    excludedFields.forEach(
      (el) =>
        delete queryObj[el]
    );

    let queryStr =
      JSON.stringify(queryObj);

    queryStr = queryStr.replace(
      /\b(gte|gt|lte|lt)\b/g,
      (match) => `$${match}`
    );

    const mongoFilter =
      JSON.parse(queryStr);

    // ================= QUERY =================

    let query = Track.find(
      mongoFilter
    );

    // ================= SORT =================

    if (req.query.sort) {

      const sortBy =
        req.query.sort
          .split(",")
          .join(" ");

      query =
        query.sort(sortBy);

    } else {

      query =
        query.sort("-createdAt");

    }

    // ================= FIELDS =================

    if (req.query.fields) {

      const fields =
        req.query.fields
          .split(",")
          .join(" ");

      query =
        query.select(fields);

    } else {

      query =
        query.select("-__v");

    }

    // ================= PAGINATION =================

    const page =
      req.query.page * 1 || 1;

    const limit =
      req.query.limit * 1 || 10;

    const skip =
      (page - 1) * limit;

    query =
      query.skip(skip).limit(limit);

    // ================= EXECUTE =================

    const [
      tracks,
      totalDocuments,
      totalTracks,
      totalLearningPaths,
      totalStudents,
    ] = await Promise.all([

      query,

      Track.countDocuments(
        mongoFilter
      ),

      Track.countDocuments(),

      LearningPath.countDocuments(),

      User.countDocuments({
        role: "user",
      }),

    ]);

    // ================= PAGINATION RESULT =================

    const totalPages =
      Math.ceil(
        totalDocuments / limit
      );

    const pagination = {

      currentPage: page,

      limit,

      totalPages,

      totalDocuments,

      ...(page < totalPages && {
        nextPage: page + 1,
      }),

      ...(page > 1 && {
        prevPage: page - 1,
      }),

    };

    // ================= RESPONSE =================

    res.status(200).json({

      status: "success",

      results:
        tracks.length,

      analytics: {

        totalTracks,

        totalLearningPaths,

        totalStudents,

      },

      pagination,

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

exports.updateTrack = HandlerFactory.updateOne(Track);