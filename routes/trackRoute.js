const express = require("express");
const router = express.Router();

const {
    createTrack,
    getAllTracks,
    getTrackById,
    updateTrack
} = require("../services/trackService");

const { protect , allowedTo} = require("../middleware/authMiddleware");
const { uploadImageAndFile, attachUploadedLinks } = require("../middleware/uploadFileMiddleware");

router.post("/", protect, allowedTo("admin"), uploadImageAndFile, attachUploadedLinks, createTrack);
router.get("/",protect , getAllTracks);
router.get("/:id", getTrackById);
router.put("/:id", allowedTo("admin"), updateTrack);

module.exports = router;