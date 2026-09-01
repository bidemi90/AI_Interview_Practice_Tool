# Architecture

The project is a JavaScript monorepo with a React client and Express API. The client communicates with versioned REST endpoints under `/api/v1`. The API owns database access and will own all future OpenRouter communication; secrets are never exposed to the browser.

Phase 0 provides application scaffolding, environment configuration, database connectivity, security middleware, centralized errors, and a health endpoint. Authentication and assessment features are intentionally deferred.

