const { check } = require("express-validator");
const validatorMiddleware = require("../../middleware/validatorMiddleware");

const gmailRegex = /^[a-zA-Z0-9._%+-]+@(?:gmail\.com)$/i;

exports.addContactUsValidator=[
    check("firstName")
        .notEmpty()
        .withMessage("First name is required")
        .isLength({ min: 2 })
        .withMessage("First name must be at least 2 characters long"),
    check("lastName")
        .notEmpty()
        .withMessage("Last name is required")
        .isLength({ min: 2 })
        .withMessage("Last name must be at least 2 characters long"),
    check("email")
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Invalid email format")
        .custom((val) => {
            if (!gmailRegex.test(val)) {
                throw new Error("email must be start with char, Matches the '@' symbol and Non-capturing group that matches the literal characters 'gmail.com '");
            }
            return true;
        }),
    check("subject")
        .optional()
        .isLength({ min: 3 })
        .withMessage("Subject must be at least 3 characters long"),
    check("message")
        .notEmpty()
        .withMessage("Message is required")
        .isLength({ min: 10 })
        .withMessage("Message must be at least 10 characters long"),
    validatorMiddleware,
];

exports.idValidator = [
    check("id")
        .notEmpty()
        .withMessage("Contact Us ID is required")
        .isMongoId()
        .withMessage("Invalid Contact Us ID format"),
    validatorMiddleware,
];