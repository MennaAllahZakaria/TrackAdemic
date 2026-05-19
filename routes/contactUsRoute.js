const express = require("express");
const { protect, allowedTo } = require("../middleware/authMiddleware");

const {
    createContactUs,
    getContactUs,
    getAllContactUs,
    resolveContactMessage
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
router
    .route("/:id/resolve")
    .put( 
        protect,
        allowedTo( "admin"),
        idValidator,
        resolveContactMessage
    );

module.exports = router;