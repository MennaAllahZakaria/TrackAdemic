const express = require("express");
const { protect, allowedTo } = require("../middleware/authMiddleware");

const {
    createContactUs,
    getContactUs,
    getAllContactUs,
} = require("../services/contactUsService");
const {
    addContactUsValidator,
    idValidator,
} = require("../utils/validators/contactUsValidator");
const router = express.Router();
router
    .route("/")
    .post(
        addContactUsValidator,
        createContactUs
    )
    .get(
        protect,
        allowedTo( "admin"),
        getAllContactUs
    );
router
    .route("/:id")
    .get(
        protect,
        allowedTo( "admin"),
        idValidator,
        getContactUs
    );

module.exports = router;