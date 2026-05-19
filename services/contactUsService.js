const ContactUs = require("../models/contactUsModel");
const handlerFactory = require("./handlerFactory");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const sendEmail = require("../utils/sendEmail");

exports.createContactUs = handlerFactory.createOne(ContactUs);

exports.getContactUs = handlerFactory.getOne(ContactUs);

exports.getAllContactUs = asyncHandler(async (req, res) => {

    const {
      page = 1,
      limit = 10,
      status,
      keyword,
      sort = "-createdAt",
    } = req.query;

    // =========================
    // FILTER
    // =========================
    const filter = {};

    // filter by status
    if (status) {
      filter.status = status;
    }

    // search
    if (keyword) {

      filter.$or = [

        {
          firstName: {
            $regex: keyword,
            $options: "i",
          },
        },

        {
          lastName: {
            $regex: keyword,
            $options: "i",
          },
        },

        {
          email: {
            $regex: keyword,
            $options: "i",
          },
        },

        {
          subject: {
            $regex: keyword,
            $options: "i",
          },
        },

        {
          message: {
            $regex: keyword,
            $options: "i",
          },
        },

      ];
    }

    // =========================
    // PAGINATION
    // =========================
    const skip =
      (page - 1) * limit;

    // =========================
    // GET DATA
    // =========================
    const [
      contacts,
      totalContacts,
      resolvedCount,
      pendingCount,
    ] = await Promise.all([

      ContactUs.find(filter)
        .sort(
          sort
            .split(",")
            .join(" ")
        )
        .skip(skip)
        .limit(Number(limit))
        .populate(
          "resolvedBy",
          "firstName lastName email"
        ),

      ContactUs.countDocuments(
        filter
      ),

      ContactUs.countDocuments({
        status: "resolved",
      }),

      ContactUs.countDocuments({
        status: "pending",
      }),

    ]);

    // =========================
    // RESPONSE
    // =========================
    res.status(200).json({

      status: "success",

      results:
        contacts.length,

      pagination: {

        currentPage:
          Number(page),

        limit:
          Number(limit),

        totalPages:
          Math.ceil(
            totalContacts / limit
          ),

        totalItems:
          totalContacts,

      },

      analytics: {

        total:
          totalContacts,

        resolved:
          resolvedCount,

        pending:
          pendingCount,

      },

      data: contacts,

    });
});

exports.resolveContactMessage = asyncHandler(async (req, res, next) => {

    const { adminReply } = req.body;

    const contact =
      await ContactUs.findById(
        req.params.id
      );

    if (!contact) {
      return next(
        new ApiError(
          "No contact message found",
          404
        )
      );
    }

    // =========================
    // UPDATE CONTACT
    // =========================
    contact.status = "resolved";

    contact.adminReply =
      adminReply || null;

    contact.resolvedAt =
      new Date();

    contact.resolvedBy =
      req.user._id;

    await contact.save();

    // =========================
    // SEND EMAIL TO USER
    // =========================
    await sendEmail({

      Email: contact.email,

      subject:
        "Your Support Request Has Been Resolved",

      message: `
            Hello ${contact.firstName},

            Your support request has been resolved successfully.

            Admin Reply:
            ${adminReply}

            Thank you for contacting TrackAdemic.
                `,

    });

    res.status(200).json({
      status: "success",
      message:"Contact message resolved successfully and email sent",
      data: contact,
    });
});