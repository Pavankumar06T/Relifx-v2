# ReLifeX — Anurag Integration / Scoped / Mock / DevOps Starter

This package implements the **Anurag workstream** described in the ReLifeX v3 project report:

- Wearables: Google Fit (scoped)
- Medicine Ordering: catalog + cart/order API (scoped)
- Diagnostics: seeded mock API
- Doctor Consultation: seeded mock API
- Firebase Cloud Messaging foundation + event adapter
- GitHub Actions CI/CD
- Deployment starter for Render
- Deployment documentation

## Important scope boundaries

This is a starter implementation for the assigned workstream, not a finished production healthcare system.

- Google Fit is limited to the scoped integration.
- Medicine Ordering does not implement live pharmacy fulfillment/delivery or payment processing.
- Diagnostics and Doctor Consultation use seeded demo data.
- Firebase notification triggers are exposed through an event adapter; final event contracts must be agreed with Harshavardhana and Pavan.
- `src/middleware/auth.js` is a temporary adapter. Replace it with Dhanajayan's final auth middleware once available.

## Run locally

```bash
npm install
cp .env.example .env
# set at least MONGODB_URI, JWT_SECRET, DEV_USER_ID
npm start
```

Health check:

```bash
curl http://localhost:4000/api/health
```

## Key endpoints

### Health & Database
- `GET /api/health` — Service health check with MongoDB connection status

### Medicine Ordering
- `GET /api/ordering/medicines` — Search and filter medicine catalog (MongoDB / JSON fallback)
- `GET /api/ordering/medicines/:id` — Medicine details by ID
- `POST /api/ordering/orders` — Place medicine order
- `GET /api/ordering/orders` — List user's placed orders
- `GET /api/ordering/orders/:id` — Get single order details
- `POST /api/ordering/orders/:id/cancel` — Cancel an order

### Diagnostics
- `GET /api/diagnostics` — List available diagnostic tests
- `GET /api/diagnostics/:id` — Diagnostic test details by ID
- `POST /api/diagnostics/bookings` — Book a diagnostic test
- `GET /api/diagnostics/bookings/my` — List user's diagnostic bookings
- `GET /api/diagnostics/bookings/:id` — Get single booking details
- `POST /api/diagnostics/bookings/:id/cancel` — Cancel diagnostic booking

### Doctor Consultation
- `GET /api/consultation/doctors` — List available doctor profiles
- `GET /api/consultation/doctors/:id` — Doctor profile details by ID
- `POST /api/consultation/bookings` — Book a doctor consultation
- `GET /api/consultation/bookings/my` — List user's consultation bookings
- `GET /api/consultation/bookings/:id` — Get single booking details
- `POST /api/consultation/bookings/:id/cancel` — Cancel consultation booking

### Google Fit (Wearables)
- `GET /api/wearables/google-fit/connect` — Generate Google OAuth consent URL
- `GET /api/wearables/google-fit/callback` — OAuth code exchange and token persistence
- `GET /api/wearables/google-fit/status` — Check token validity, expiry, and connection state
- `POST /api/wearables/google-fit/disconnect` — Revoke and delete stored tokens
- `GET /api/wearables/google-fit/activity` — Fetch step count, calories, distance (with mock fallback)
- `GET /api/wearables/google-fit/summary` — Normalized daily wearable payload proposal for Harshavardhana
- `POST /api/wearables/google-fit/sync` — Client / manual fitness data sync

### FCM Notifications & Event Adapter
- `POST /api/notifications/push` — Direct push notification dispatch
- `POST /api/notifications/events` — Event trigger adapter for Habit Engine & AI Insights
- `GET /api/notifications/history` — Notification dispatch history from MongoDB


## Integration handoffs

### Handoff from Dhanajayan

Provide the final auth middleware contract. Replace the temporary `requireAuth` adapter with the team's shared middleware and preserve `req.user.id` as the authenticated user identifier, or update the route contract consistently.

### Handoff from Harshavardhana

Agree on the internal activity/workout contract consumed by the Fitness module, plus notification events emitted by Health Tracking/Habit Engine.

Suggested event shape:

```json
{
  "eventType": "HABIT_REMINDER",
  "token": "FCM_DEVICE_TOKEN",
  "payload": {"body": "Your habit is ready to check in."}
}
```

### Handoff from Pavan

Agree on the AI insight notification event contract (for example `INSIGHT_READY`) and payload fields.

## Deployment

The included GitHub Actions workflow performs CI on pull requests and main/develop pushes. The deploy workflow can trigger Render using a `REPLIFEX_RENDER_DEPLOY_HOOK` repository secret.

See `docs/deployment-runbook.md` for the deployment checklist.
