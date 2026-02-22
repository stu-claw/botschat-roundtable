# BotsChat RoundTable

## Setup Instructions

1. Clone the repository.
2. Install dependencies with `npm install` in the root.
3. Run `npm run dev` to start both API and Web in development mode.

## Running Locally

- Root `npm run dev` runs both backend API and frontend web.
- `npm run build` builds both packages.
- `npm run start` starts the API server.

## Environment Variables

Create a `.env` file in the root (or appropriate location) based on `.env.example` with the following variables:

```
DATABASE_URL
JWT_SECRET
OPENROUTER_API_KEY
PORT (default 3001)
FRONTEND_URL
```

## API Documentation

The API is built with Express and includes WebSocket support and JWT authentication.

Use the `packages/api/src` directory for the API source code.

Scripts:
- `npm run dev` - runs API with nodemon.
- `npm run build` - transpiles TypeScript to JavaScript.
- `npm run start` - starts the API in production mode.
