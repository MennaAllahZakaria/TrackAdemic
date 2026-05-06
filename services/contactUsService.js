const ContactUs = require("../models/contactUsModel");
const handlerFactory = require("./handlerFactory");

exports.createContactUs = handlerFactory.createOne(ContactUs);

exports.getContactUs = handlerFactory.getOne(ContactUs);

exports.getAllContactUs = handlerFactory.getAll(ContactUs);