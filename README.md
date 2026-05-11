# TrackAdemic — Backend API

**TrackAdemic** is a personalized academic tracking platform. It uses AI to generate customized learning paths, tracks student progress, conducts adaptive assessments, and supports real-time chat between the learner and an AI mentor.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Installation & Running](#installation--running)
- [Authentication & Authorization](#authentication--authorization)
- [API Reference](#api-reference)
  - [Auth](#auth)
  - [Learning Path](#learning-path)
  - [Progress](#progress)
  - [Assessment](#assessment)
  - [Quiz](#quiz)
  - [Chat](#chat)
  - [Tracks](#tracks)
  - [Notifications](#notifications)
  - [Contact Us](#contact-us)
  - [Admin Dashboard](#admin-dashboard)
- [Data Models](#data-models)
- [Utilities & Middleware](#utilities--middleware)
- [Cron Jobs](#cron-jobs)
- [File Uploads](#file-uploads)
- [Push Notifications (Firebase)](#push-notifications-firebase)
- [Error Handling](#error-handling)
- [Deployment (Vercel)](#deployment-vercel)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js v5 |
| Database | MongoDB (Mongoose v9) |
| Auth | JWT + bcrypt |
| File Storage | Cloudinary |
| Push Notifications | Firebase Admin SDK |
| Email | Nodemailer |
| AI Integration | External AI microservice (`AI_BASE_URL`) |
| Scheduling | node-cron |
| Deployment | Vercel |

---

## Project Structure

```
TrackAdemic/
│
├── config/
│   └── database.js           # MongoDB connection
│
├── cornJobs/
│   ├── cornJobs.js
│   └── dailyReminder.js      # Daily push notification cron + reminder helper
│
├── fireBase/
│   └── admin.js              # Firebase Admin SDK initialization
│
├── middleware/
│   ├── authMiddleware.js     # JWT protect + allowedTo(role)
│   ├── errorMiddleware.js    # Global error handler
│   ├── uploadFileMiddleware.js  # Multer + Cloudinary upload
│   └── validatorMiddleware.js   # express-validator error formatter
│
├── models/
│   ├── userModel.js
│   ├── userContextModel.js
│   ├── learningPathModel.js
│   ├── progressModel.js
│   ├── assessmentSessionModel.js
│   ├── questionModel.js      # Quiz (questions + practical task)
│   ├── quizModel.js          # QuizAttempt (submitted results)
│   ├── chatMessageModel.js
│   ├── trackModel.js
│   ├── notificationModel.js
│   ├── contactUsModel.js
│   └── verificationModel.js
│
├── routes/
│   ├── index.js              # Route mounting + CORS
│   ├── authRoute.js
│   ├── learningPathRoute.js
│   ├── progressRoute.js
│   ├── assessmentRoute.js
│   ├── quizRoute.js
│   ├── chatMessageRoute.js
│   ├── trackRoute.js
│   ├── notificationRoute.js
│   ├── contactUsRoute.js
│   ├── userContextRoute.js
│   └── adminRoute.js         # Admin dashboard routes
│
├── services/
│   ├── authService.js
│   ├── learningPathService.js
│   ├── progressService.js
│   ├── assessmentService.js
│   ├── quizService.js
│   ├── chatMessageService.js
│   ├── trackService.js
│   ├── notificationService.js
│   ├── contactUsService.js
│   ├── userContextService.js
│   ├── adminService.js       # Admin logic
│   └── handlerFactory.js     # Generic CRUD factory
│
├── utils/
│   ├── apiError.js
│   ├── apiFeatures.js        # Filtering, sorting, pagination, search
│   ├── cloudinary.js
│   ├── createToken.js
│   ├── fcmToken.js           # AES-256 encrypt/decrypt for FCM tokens
│   ├── generatePassword.js
│   ├── sendEmail.js
│   └── validators/
│       ├── authValidator.js
│       └── contactUsValidator.js
│
├── index.js                  # App entry point
├── vercel.json
└── package.json
```

---

## Environment Variables

Create a `config.env` file in the project root:

```env
# App
NODE_ENV=development
PORT=8000

# Database
DB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/trackademic

# JWT
JWT_SECRET_KEY=your_jwt_secret
JWT_EXPIRE_TIME=7d

# Bcrypt
HASH_PASS=12

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@email.com
EMAIL_PASS=your_app_password

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Firebase (push notifications)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}

# FCM token encryption (must be 64 hex chars = 32 bytes)
ENCRYPTION_KEY=your_64_char_hex_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id

# AI microservice
AI_BASE_URL=https://your-ai-service.com
```

---

## Installation & Running

```bash
# Install dependencies
npm install

# Development (with hot reload)
npm run dev

# Production
npm run start:prod
```

The server runs on `http://localhost:8000` by default.

---

## Authentication & Authorization

All protected routes require a JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

### Roles

| Role | Description |
|---|---|
| `user` | Regular learner — can access learning paths, quizzes, assessment, chat |
| `admin` | Platform administrator — full access including the admin dashboard |

### Middleware

- `protect` — verifies the JWT, attaches `req.user`
- `allowedTo("admin")` — must always come **after** `protect`

---

## API Reference

> **Base URL:** `https://track-ademic.vercel.app`
>
> All responses follow the format:
> ```json
> { "status": "success", "data": { ... } }
> ```
> Error responses:
> ```json
> { "status": "fail", "message": "..." }
> ```

---

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | Public | Register — sends email verification code |
| POST | `/auth/verifyEmailUser` | Public | Verify code and create account |
| POST | `/auth/resendVerificationCode` | Public | Resend verification code |
| POST | `/auth/login` | Public | Login with email + password |
| POST | `/auth/google-login` | Public | Login with Google ID token |
| POST | `/auth/forgetPassword` | Public | Send password reset code |
| POST | `/auth/verifyForgotPasswordCode` | Public | Verify reset code |
| POST | `/auth/resetPassword` | Public | Set new password |
| PUT | `/auth/changePassword` | User | Change current password |
| GET | `/auth/me` | User | Get logged-in user data |
| PATCH | `/auth/updateImageProfile` | User | Upload profile image |
| POST | `/auth/updateFcmToken` | User | Save/update Firebase FCM token |

#### POST `/auth/signup`

```json
{
  "firstName": "Ahmed",
  "lastName": "Ali",
  "email": "ahmed@example.com",
  "password": "Str0ngPass!",
  "confirmPassword": "Str0ngPass!"
}
```

#### POST `/auth/login`

```json
{
  "email": "ahmed@example.com",
  "password": "Str0ngPass!"
}
```

**Response:**
```json
{
  "status": "success",
  "token": "eyJhbGc...",
  "data": { "user": { ... } }
}
```

---

### Learning Path

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/learning-path/generate` | User | Generate AI learning path |
| GET | `/learning-path/me` | User | Get active learning path |
| POST | `/learning-path/regenerate` | User | Regenerate learning path |

#### POST `/learning-path/generate`

Requires a `UserContext` to exist. The AI generates a structured learning path with phases, courses, milestones, and weekly schedule.

```json
{
  "field": "Frontend Development",
  "goal": "Get a job as a junior frontend developer",
  "level": "beginner",
  "hoursPerDay": 3
}
```

**Response structure:**
```json
{
  "status": "success",
  "data": {
    "meta": { "path_title": "...", "total_weeks": 12, "total_hours": 200 },
    "phases": [
      {
        "phase_number": 1,
        "phase_title": "HTML & CSS Fundamentals",
        "week_start": 1,
        "week_end": 3,
        "courses": [ { "title": "...", "platform": "...", "estimated_hours": 20 } ],
        "milestones": [ { "title": "Build a static webpage", "how_to_verify": "..." } ],
        "project": { "title": "Portfolio page", "estimated_hours": 8 }
      }
    ],
    "weekly_schedule": { ... },
    "overall_milestones": [ ... ],
    "success_metrics": { ... }
  }
}
```

---

### Progress

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/progress/update` | User | Update completed topics and study hours |
| GET | `/progress/me` | User | Get current progress |

#### POST `/progress/update`

```json
{
  "topic": "CSS Flexbox",
  "hours": 1.5
}
```

Both fields are optional — you can send only `topic` or only `hours`. The service automatically recalculates `overallProgress` percentage and updates `UserContext`.

---

### Assessment

Adaptive assessment powered by AI. Sessions are single-use (you must complete a session before starting a new one).

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/assessment/start` | User | Start a new assessment session |
| POST | `/assessment/answer` | User | Submit answer for current question |
| GET | `/assessment/active` | User | Get current active session |
| GET | `/assessment/result` | User | Get all past assessment results |
| GET | `/assessment/:sessionId` | User | Get specific session details |

#### POST `/assessment/answer`

```json
{
  "sessionId": "abc123",
  "answer": "B"
}
```

---

### Quiz

AI-generated quizzes per topic.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/quiz/generate` | User | Generate a new quiz |
| POST | `/quiz/submit` | User | Submit answers and get results |
| GET | `/quiz/my` | User | Get all my quiz attempts |
| GET | `/quiz/:id` | User | Get a specific quiz |
| GET | `/quiz/admin/all` | Admin | Get all quizzes across all users |

#### POST `/quiz/generate`

```json
{
  "topic": "CSS Flexbox",
  "level": "beginner",
  "num_questions": 10,
  "course_title": "CSS Mastery"
}
```

**Response includes:**
- Multiple choice questions with options and correct answers
- A practical task with expected output and evaluation criteria
- `passing_score` threshold

#### POST `/quiz/submit`

```json
{
  "quizId": "64abc...",
  "answers": { "1": "A", "2": "C", "3": "B" }
}
```

---

### Chat

AI-powered chat mentor that uses the user's full learning context and chat history.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/chat/send` | User | Send message to AI mentor |
| GET | `/chat/history` | User | Get last 50 messages |

#### POST `/chat/send`

```json
{
  "message": "I don't understand CSS Grid, can you explain it simply?"
}
```

The service automatically:
- Detects topic signals in the message
- Detects weak signals (e.g., "مش فاهم", "صعب")
- Updates `strongTopics` / `weakTopics` in progress accordingly
- Maintains last 10 messages as context for AI

---

### Tracks

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/tracks` | Admin | Create a new track (with image upload) |
| GET | `/tracks` | User | Get all tracks (filtering, sorting, pagination) |
| GET | `/tracks/:id` | Public | Get track by ID |
| PUT | `/tracks/:id` | Admin | Update track |

#### POST `/tracks` — multipart/form-data

| Field | Type | Required |
|---|---|---|
| `title` | string | ✓ |
| `description` | string | ✓ (10–500 chars) |
| `trackImage` | file (image) | ✓ |
| `category` | string | |
| `level` | Beginner \| Intermediate \| Advanced | |
| `totalHours` | number | |
| `totalModules` | number | |

#### GET `/tracks` — Query Parameters

| Param | Description | Example |
|---|---|---|
| `page` | Page number | `?page=2` |
| `limit` | Items per page | `?limit=5` |
| `sort` | Sort field | `?sort=-createdAt` |
| `fields` | Select fields | `?fields=title,level` |
| `level` | Filter by level | `?level=Beginner` |
| `category` | Filter by category | `?category=Frontend` |

---

### Notifications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/notifications` | Admin | Send notification to a user by email |
| GET | `/notifications/all` | User/Admin | Get notifications (admin sees all, user sees own) |
| GET | `/notifications/:id` | User/Admin | Get notification by ID |
| PUT | `/notifications/read/:id` | User | Mark notification as read |
| DELETE | `/notifications/:id` | User | Delete a notification |
| DELETE | `/notifications/all` | User | Delete all my notifications |
| GET | `/notifications/start-daily-reminder` | Public | Trigger daily reminder to all users |

> Notifications auto-expire after **7 days** via a MongoDB TTL index.

#### POST `/notifications`

```json
{
  "title": "Reminder",
  "message": "Don't forget to complete your daily study session!",
  "userEmail": "ahmed@example.com"
}
```

---

### Contact Us

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/contactUs` | Public | Submit a contact message |
| GET | `/contactUs` | Admin | Get all messages |
| GET | `/contactUs/:id` | Admin | Get message by ID |

#### POST `/contactUs`

```json
{
  "firstName": "Sara",
  "lastName": "Mohamed",
  "email": "sara@example.com",
  "subject": "Bug Report",
  "message": "I found an issue with the quiz submission..."
}
```

---

### Admin Dashboard

All admin routes require: `Authorization: Bearer <admin_token>`

#### Dashboard Stats

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/stats` | Full overview: user counts, content counts, activity stats, top streaks, recent signups |

**Response:**
```json
{
  "status": "success",
  "data": {
    "users": { "total": 120, "active": 110, "banned": 3, "inactive": 7 },
    "content": { "tracks": 8, "learningPaths": 98 },
    "activity": {
      "quizAttempts": 430,
      "avgQuizScore": 72,
      "contactMessages": 15,
      "notifications": 850
    },
    "topStreaks": [ { "firstName": "Ahmed", "streak": { "count": 21, "longest": 30 } } ],
    "recentUsers": [ { ... } ]
  }
}
```

---

#### User Management

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/users` | List all users |
| GET | `/admin/users/:id` | Get user by ID |
| GET | `/admin/users/:id/profile` | Full profile: user + progress + learning path + quiz count |
| PATCH | `/admin/users/:id/status` | Update status: `active` / `inactive` / `banned` |
| PATCH | `/admin/users/:id/role` | Update role: `user` / `admin` |
| DELETE | `/admin/users/:id` | Delete user permanently |

**GET `/admin/users` — Query Parameters:**

| Param | Description | Example |
|---|---|---|
| `page` | Page number | `?page=1` |
| `limit` | Items per page | `?limit=10` |
| `status` | Filter by status | `?status=banned` |
| `role` | Filter by role | `?role=admin` |
| `keyword` | Search by name or email | `?keyword=ahmed` |
| `sort` | Sort field | `?sort=-createdAt` |

**PATCH `/admin/users/:id/status`**
```json
{ "status": "banned" }
```

**PATCH `/admin/users/:id/role`**
```json
{ "role": "admin" }
```

> Admins cannot change their own status or role.

---

#### Contact Us (Admin)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/contact` | Get all messages with search + pagination |
| GET | `/admin/contact/:id` | Get single message |
| DELETE | `/admin/contact/:id` | Delete message |

**GET `/admin/contact` — Query Parameters:**

| Param | Description |
|---|---|
| `page` / `limit` | Pagination |
| `keyword` | Search in name, email, subject, message |
| `sort` | Sort field (default: `-createdAt`) |

---

#### Quizzes (Admin)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/quizzes` | All quiz attempts with filters |
| GET | `/admin/quizzes/stats` | Aggregated quiz statistics |
| GET | `/admin/quizzes/:id` | Single attempt details |
| DELETE | `/admin/quizzes/:id` | Delete attempt |

**GET `/admin/quizzes` — Query Parameters:**

| Param | Description |
|---|---|
| `page` / `limit` | Pagination |
| `topic` | Filter by topic (partial match) |
| `userId` | Filter by user ID |
| `sort` | Sort field |

**GET `/admin/quizzes/stats` — Response:**
```json
{
  "data": {
    "total": 430,
    "avgScore": 72,
    "passRate": 68,
    "topTopics": [
      { "topic": "CSS Flexbox", "count": 85, "avgScore": 74.2 }
    ],
    "scoreDistribution": [
      { "_id": 0,  "count": 12 },
      { "_id": 20, "count": 30 },
      { "_id": 40, "count": 80 },
      { "_id": 60, "count": 190 },
      { "_id": 80, "count": 118 }
    ]
  }
}
```

---

## Data Models

### User

| Field | Type | Notes |
|---|---|---|
| `firstName`, `lastName` | String | Required |
| `email` | String | Unique, lowercase |
| `password` | String | Hashed with bcrypt, not returned in responses |
| `role` | `user` \| `admin` | Default: `user` |
| `status` | `active` \| `inactive` \| `banned` | Default: `active` |
| `imageProfile` | String | Cloudinary URL |
| `fcmToken` | String | AES-256 encrypted Firebase token |
| `googleId` | String | For Google OAuth |
| `streak.count` | Number | Current streak days |
| `streak.longest` | Number | Longest streak ever |
| `streak.lastActiveDate` | Date | Last activity date |

### UserContext

Stores the user's learning profile and is updated continuously as they progress.

| Field | Type | Notes |
|---|---|---|
| `user` | ObjectId | Ref: User |
| `field` | String | e.g., "Frontend Development" |
| `goal` | String | User's learning goal |
| `level` | `beginner` \| `intermediate` \| `advanced` | |
| `stage` | `assessment` \| `onboarding` \| `learning` \| `recovery` | |
| `currentPhaseNumber`, `currentPhaseTitle` | Number, String | Current phase |
| `completedTopics`, `remainingTopics` | [String] | |
| `strongTopics`, `weakTopics` | [String] | Detected by chat service |
| `overallProgressPercent` | Number | 0–100 |
| `totalHoursStudied`, `hoursStudiedThisWeek` | Number | |

### LearningPath

| Field | Type | Notes |
|---|---|---|
| `user` | ObjectId | |
| `meta` | Object | `path_title`, `field`, `total_weeks`, `total_hours`, `progression` |
| `phases` | [Phase] | Each has courses, milestones, project |
| `weekly_schedule` | Object | Hours/day, daily breakdown |
| `overall_milestones` | [Object] | Week + title + description |
| `isActive` | Boolean | Only one active path per user |
| `generatedFrom` | Object | Original input: field, level, goal, hoursPerDay |

### Progress

| Field | Type | Notes |
|---|---|---|
| `user` | ObjectId | |
| `learningPath` | ObjectId | |
| `completedTopics` | [String] | |
| `strongTopics`, `weakTopics` | [String] | |
| `totalHoursStudied`, `hoursThisWeek` | Number | |
| `overallProgress` | Number | Percentage, auto-calculated |

### Notification

| Field | Type | Notes |
|---|---|---|
| `title`, `message` | String | Required |
| `recipient` | ObjectId | Ref: User |
| `sendBy` | ObjectId | Null for system notifications |
| `read` | Boolean | Default: false |
| `expires` | Date | Auto-set to 7 days from creation (TTL index) |

### Quiz (questionModel)

| Field | Type | Notes |
|---|---|---|
| `user` | ObjectId | |
| `topic`, `level` | String | |
| `questions` | [Question] | Each: id, question, options, correct_answer, explanation |
| `practical_task` | Object | title, description, expected_output, estimated_minutes, evaluation_criteria |
| `passing_score` | Number | |
| `isSubmitted` | Boolean | Default: false |

### QuizAttempt (quizModel)

Stores submitted quiz results.

| Field | Type | Notes |
|---|---|---|
| `user` | ObjectId | |
| `topic` | String | |
| `score`, `total`, `percentage` | Number | |
| `results` | [Object] | Per-question: question, correct, topic |

---

## Utilities & Middleware

### ApiFeatures (`utils/apiFeatures.js`)

Chainable query builder used by `handlerFactory.getAll()`:

```js
new ApiFeatures(Model.find(), req.query)
  .filter()       // field[gte]=, field[lte]=, etc.
  .sort()         // ?sort=-createdAt,title
  .limitFields()  // ?fields=title,email
  .search()       // ?keyword=react
  .paginate(count)
```

### HandlerFactory (`services/handlerFactory.js`)

Generic CRUD factory. Returns reusable async handlers:

```js
exports.createOne  = (Model) => ...
exports.getOne     = (Model, populateOptions) => ...
exports.getAll     = (Model, modelName) => ...
exports.updateOne  = (Model) => ...
exports.deleteOne  = (Model) => ...
```

### FCM Token Encryption (`utils/fcmToken.js`)

Firebase tokens are stored encrypted using AES-256-CBC:
- `encryptToken(token)` — encrypts before saving to DB
- `decryptToken(encrypted)` — decrypts before sending push notification

### File Upload (`middleware/uploadFileMiddleware.js`)

Uses `multer` + `multer-storage-cloudinary`. Accepts two fields:
- `imageProfile` → stored in `profile_images/` folder on Cloudinary
- `trackImage` → stored in `track_images/` folder on Cloudinary

Maximum file size: **50 MB**

---

## Cron Jobs

### Daily Reminder (`cornJobs/dailyReminder.js`)

**`sendReminder(user, type)`** — sends a Firebase push notification and saves it to the database.

Notification types:

| Type | Title | Trigger |
|---|---|---|
| `daily` | Daily Momentum Alert | Cron job / manual trigger |
| `milestone` | New Milestone Reached | User completes a learning phase |
| `streak` | Streak Alert | Streak about to break |
| `progress` | Progress Update | User logs study hours |

**Trigger endpoint:** `GET /notifications/start-daily-reminder`
Sends daily reminders to all users with `role: user`.

---

## File Uploads

Upload fields accepted by the API:

| Field Name | Used In | Storage |
|---|---|---|
| `imageProfile` | `PATCH /auth/updateImageProfile` | Cloudinary `profile_images/` |
| `trackImage` | `POST /tracks` | Cloudinary `track_images/` |

All uploads go through `uploadImageAndFile` middleware, which validates type and stores to Cloudinary, then `attachUploadedLinks` attaches the URL to `req.imageProfileUrl` or `req.trackImageUrl`.

---

## Push Notifications (Firebase)

1. User saves their FCM token via `POST /auth/updateFcmToken`
2. Token is encrypted with AES-256 and stored in `user.fcmToken`
3. When a notification is triggered, the token is decrypted and used to call `admin.messaging().send()`
4. Notifications are also saved to the `Notification` collection for in-app display

---

## Error Handling

All errors go through `middleware/errorMiddleware.js`.

**Development** — returns full error with stack trace:
```json
{
  "status": "error",
  "message": "...",
  "error": { ... },
  "stack": "..."
}
```

**Production** — returns only message:
```json
{
  "status": "fail",
  "message": "Invalid token, please login again.."
}
```

Special cases handled in production:
- `JsonWebTokenError` → 401 Invalid token
- `TokenExpiredError` → 401 Token expired

Unhandled promise rejections outside Express are caught globally and shut the server down gracefully.

---

## Deployment (Vercel)

The project is configured for Vercel serverless deployment via `vercel.json`:

```json
{
  "version": 2,
  "builds": [{ "src": "index.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "index.js" }]
}
```

**Live URL:** `https://track-ademic.vercel.app`

To deploy:
```bash
vercel --prod
```

Make sure all environment variables are set in the Vercel project dashboard.

---

## Security Notes

- JWT tokens expire per `JWT_EXPIRE_TIME` env variable
- Admin signup is blocked at the route level — admins can only be created by another admin via `PATCH /admin/users/:id/role`
- FCM tokens are AES-256-CBC encrypted before storage
- Passwords are hashed with bcrypt (12 salt rounds by default)
- `protect` middleware must always precede `allowedTo()` on any route
- Sensitive fields (`password`, `passwordResetCode`, FCM token, etc.) are stripped from all JSON responses via Mongoose `toJSON` transform