# AI Interview Assessment Platform

A job-seeker interview preparation platform. Phase 2 includes JWT authentication, profiles, job input, and structured OpenRouter job analysis. Assessment generation and dashboard analytics are not implemented yet.

## Project structure

```text
client/   React, Vite, React Router, Tailwind CSS, and Axios
server/   Node.js, Express, Mongoose, CORS, and Helmet
docs/     Project documentation
```

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- A MongoDB Atlas database or compatible MongoDB instance

## Installation

From the project root:

```bash
npm install
```

The root npm workspace installs dependencies for both applications.

## Environment setup

Create local environment files from the supplied examples:

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

On Windows PowerShell, use `Copy-Item` instead of `cp` if preferred. Never commit the resulting `.env` files.

### Client variables

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the backend API, normally `http://localhost:5000/api/v1` |

### Server variables

| Variable | Purpose |
|---|---|
| `PORT` | API port, normally `5000` |
| `NODE_ENV` | Runtime environment, normally `development` locally |
| `MONGODB_URI` | MongoDB connection string; required to start the API |
| `JWT_SECRET` | Strong secret reserved for Phase 1 authentication |
| `JWT_EXPIRES_IN` | Future JWT lifetime, such as `1d` |
| `OPENROUTER_API_KEY` | OpenRouter key reserved for a later phase |
| `OPENROUTER_MODEL` | OpenRouter model identifier reserved for a later phase |
| `OPENROUTER_BASE_URL` | OpenRouter API base URL |
| `OPENROUTER_TIMEOUT_MS` | Per-request OpenRouter timeout; defaults to `120000` for slower free models |
| `CLIENT_URL` | Allowed frontend CORS origin, normally `http://localhost:5173` |

OpenRouter values are recognized by configuration but Phase 0 makes no AI requests.

## Phase 1 API

```text
POST  /api/v1/auth/register
POST  /api/v1/auth/login
GET   /api/v1/users/me
PATCH /api/v1/users/me
PATCH /api/v1/users/me/password
```

## Phase 2 API

```text
GET    /api/v1/roles
POST   /api/v1/jobs/analyze
GET    /api/v1/jobs
GET    /api/v1/jobs/:jobProfileId
DELETE /api/v1/jobs/:jobProfileId
```

## Phase 3 API

```text
POST /api/v1/assessments
GET  /api/v1/assessments/:id/status
GET  /api/v1/assessments/:id
GET  /api/v1/assessments/:id/questions
```

Assessment creation uses a deterministic application-generated blueprint and section-by-section OpenRouter generation. Public question responses exclude correct answers, acceptable answers, and explanations.

## Phase 4 API

```text
POST  /api/v1/assessments/:id/start
GET   /api/v1/assessments/:id
GET   /api/v1/assessments/:id/questions/:questionId
GET   /api/v1/assessments/:id/questions/by-index/:index
PUT   /api/v1/assessments/:id/answers/:questionId
PATCH /api/v1/assessments/:id/progress
POST  /api/v1/assessments/:id/submit
```

Phase 4 stores answers separately, supports idempotent resume, requires all questions before submission, and makes submitted assessments read-only. It does not calculate or expose scores.

Protected endpoints require `Authorization: Bearer <token>`. The V1 browser client keeps this short-lived access token in local storage. Refresh tokens are intentionally deferred.

## Development

Run both applications from the root:

```bash
npm run dev
```

Or run them separately:

```bash
npm run dev:client
npm run dev:server
```

The frontend is normally available at `http://localhost:5173`. The backend is normally available at `http://localhost:5000`, with its health endpoint at `http://localhost:5000/api/v1/health`.

## Checks

```bash
npm run build
npm run lint
npm run check
npm run test --workspace server
```
