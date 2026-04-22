const mongoose = require("mongoose");

/* ================= COURSE ================= */
const courseSchema = new mongoose.Schema(
  {
    id: String,
    title: String,
    instructor: String,
    platform: String,
    search_query: String,
    estimated_hours: Number,
    is_free: Boolean,
    topics: [String],
    why_this_course: String,
  },
  { _id: false }
);

/* ================= MILESTONE ================= */
const milestoneSchema = new mongoose.Schema(
  {
    title: String,
    type: String,
    how_to_verify: String,
  },
  { _id: false }
);

/* ================= PROJECT ================= */
const projectSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    estimated_hours: Number,
    deliverable: String,
  },
  { _id: false }
);

/* ================= PHASE ================= */
const phaseSchema = new mongoose.Schema(
  {
    phase_number: Number,
    phase_title: String,
    week_start: Number,
    week_end: Number,
    objective: String,
    courses: [courseSchema],
    milestones: [milestoneSchema],
    project: projectSchema,
  },
  { _id: false }
);

/* ================= MAIN ================= */
const learningPathSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    meta: {
      path_title: String,
      field: String,
      total_weeks: Number,
      total_hours: Number,
      progression: String,
    },

    phases: [phaseSchema],

    weekly_schedule: {
      hours_per_day: Number,
      days_per_week: Number,
      daily_breakdown: {
        theory_min: Number,
        practice_min: Number,
        review_min: Number,
      },
      weekly_plan: [
        {
          day: String,
          focus: String,
          duration_hrs: Number,
        },
      ],
    },

    overall_milestones: [
      {
        week: Number,
        title: String,
        description: String,
      },
    ],

    success_metrics: {
      weekly_checks: [String],
      phase_gates: [String],
      final_outcome: String,
    },

    adaptation_tips: [String],

    generatedFrom: {
      field: String,
      level: String,
      goal: String,
      hoursPerDay: Number,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LearningPath", learningPathSchema);