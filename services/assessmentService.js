const asyncHandler = require("express-async-handler");
const axios = require("axios");
const AssessmentSession = require("../models/assessmentSessionModel");
const Progress = require("../models/progressModel");

exports.startAssessment = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { field, goal, user_context } = req.body;

  if (!field || !user_context) {
    return res.status(400).json({
      message: "field and user_context required",
    });
  }

  /* ================= CALL AI ================= */

  let aiData;

  try {
    const response = await axios.post(
      process.env.AI_BASE_URL + "/assessment/start",
      {
        field,
        goal,
        user_context,
      },
      { timeout: 8000 }
    );

    aiData = response.data;
  } catch (err) {
    return res.status(500).json({
      message: "AI failed to start assessment",
    });
  }

  /* ================= SAVE SESSION ================= */

  const session = await AssessmentSession.create({
    user: userId,
    sessionId: aiData.session_id,
    currentQuestion: aiData.question_number,
    totalQuestions: aiData.total_questions,
  });

  res.status(200).json({
    status: "success",
    sessionId: session.sessionId,
    question: aiData.question,
    questionNumber: aiData.question_number,
    totalQuestions: aiData.total_questions,
  });
});


exports.answerAssessment = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { sessionId, answer } = req.body;

  if (!sessionId || !answer) {
    return res.status(400).json({
      message: "sessionId and answer required",
    });
  }

  /* ================= GET SESSION ================= */

  const session = await AssessmentSession.findOne({
    user: userId,
    sessionId,
  });

  if (!session || session.isCompleted) {
    return res.status(400).json({
      message: "Invalid or completed session",
    });
  }

  /* ================= CALL AI ================= */

  let aiData;

  try {
    const response = await axios.post(
      process.env.AI_BASE_URL + "/assessment/answer",
      {
        session_id: sessionId,
        answer,
      },
      { timeout: 8000 }
    );

    aiData = response.data;
  } catch (err) {
    return res.status(500).json({
      message: "AI failed",
    });
  }

  /* ================= SAVE ANSWER ================= */

  session.answers.push({
    questionId: session.currentQuestion,
    answer,
  });

  /* ================= CHECK END ================= */

  if (!aiData.question) {
    session.isCompleted = true;

    const updatedContext = aiData.updated_user_context;

    session.result = {
      level: updatedContext.level,
      strongTopics: updatedContext.strong_topics || [],
      weakTopics: updatedContext.weak_topics || [],
      summary: aiData.assessment_summary,
    };

    await session.save();

    /* ================= UPDATE PROGRESS ================= */

    let progress = await Progress.findOne({ user: userId });

    if (!progress) {
      progress = await Progress.create({ user: userId });
    }

    progress.strongTopics = [
      ...new Set([
        ...progress.strongTopics,
        ...session.result.strongTopics,
      ]),
    ];

    progress.weakTopics = [
      ...new Set([
        ...progress.weakTopics,
        ...session.result.weakTopics,
      ]),
    ];

    await progress.save();

    return res.status(200).json({
      status: "completed",
      result: session.result,
      updated_user_context: updatedContext,
    });
  }

  /* ================= NEXT QUESTION ================= */

  session.currentQuestion = aiData.question_number;
  await session.save();

  res.status(200).json({
    status: "success",
    question: aiData.question,
    questionNumber: aiData.question_number,
    totalQuestions: aiData.total_questions,
  });
});