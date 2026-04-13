const authRoute = require("./authRoute");
const learningPathRoute = require("./learningPathRoute");
const chatMessageRoute = require("./chatMessageRoute");
const progressRoute = require("./progressRoute");
const quizRoute = require("./quizRoute");
const assessmentRoute = require("./assessmentRoute");

const mountRoutes = (app) => {
    app.use((req, res, next) => {
        const origin = req.headers.origin;

        if (origin) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Vary", "Origin");
        }

        res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        );
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.header("Access-Control-Allow-Credentials", "true");

        if (req.method === "OPTIONS") {
        return res.sendStatus(200);
        }

        next();
    });

//=============================
// Mounting various routes
//=============================

app.use("/auth", authRoute);
app.use("/learning-path", learningPathRoute);
app.use("/chat", chatMessageRoute);
app.use("/progress", progressRoute);
app.use("/quiz", quizRoute);
app.use("/assessment", assessmentRoute);

//=============================
// 404 Handler
//=============================
app.use((req, res, next) => {
    res.status(404).json({
        status: 'fail',
        message: `Can't find this route: ${req.originalUrl}`,
    });
});

}

module.exports = mountRoutes;
