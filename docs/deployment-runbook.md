# ReLifeX Deployment Runbook — Anurag

## 1. Repository setup

- Push this service into the team repository or merge the `src`, `data`, `scripts`, and workflow folders into the canonical backend repo.
- Ensure secrets are never committed.

## 2. MongoDB

Create a MongoDB database and set `MONGODB_URI` in the deployment environment.

## 3. Render / AWS

Deploy the Node.js service with:

- Build command: `npm ci`
- Start command: `npm start`
- Node: 20+

Required environment variables are listed in `.env.example`.

## 4. Google Fit

1. Create/configure the Google Cloud project.
2. Enable the Fitness API required by the chosen Google Fit integration.
3. Create OAuth credentials.
4. Add the deployed callback URL to the OAuth client.
5. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`.

Do not commit client secrets.

## 5. Firebase Cloud Messaging

Set Firebase Admin credentials as deployment secrets:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Validate push delivery using the `/api/notifications/push` endpoint with a valid device token.

## 6. Auth handoff

Before production use, replace the temporary auth adapter with Dhanajayan's shared middleware and remove any development-only auth bypass.

## 7. CI/CD

Add GitHub repository secret:

- `REPLIFEX_RENDER_DEPLOY_HOOK`

Then enable the deploy workflow.

## 8. Smoke tests after deployment

- `GET /api/health`
- catalog retrieval
- diagnostic listing
- doctor listing
- order placement using a test user
- Google Fit OAuth flow
- FCM test notification
- verify logs and error handling

## 9. Play Console

The Flutter mobile release pipeline belongs to the overall project. This workstream provides the backend deployment configuration and CI foundation; the final Play Console release should be run from the team's canonical mobile project once the frontend build is integrated.
