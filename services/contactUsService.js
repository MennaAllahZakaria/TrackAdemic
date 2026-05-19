const ContactUs = require("../models/contactUsModel");
const handlerFactory = require("./handlerFactory");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const sendEmail = require("../utils/sendEmail");

exports.createContactUs = handlerFactory.createOne(ContactUs);

exports.getContactUs = handlerFactory.getOne(ContactUs);

exports.getAllContactUs = handlerFactory.getAll(ContactUs);

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