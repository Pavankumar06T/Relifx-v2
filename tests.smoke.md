# Smoke test checklist

1. Start MongoDB and copy `.env.example` to `.env`.
2. Set `MONGODB_URI`, `JWT_SECRET`, and `DEV_USER_ID=test-user-001`.
3. Run `npm install && npm start`.
4. `GET /api/health` should return `{status:"ok", mongodb:{...}}`.
5. `GET /api/ordering/medicines` should return the catalog with query/category filters.
6. `GET /api/ordering/medicines/:id` should return single medicine details.
7. `GET /api/diagnostics` and `GET /api/diagnostics/:id` should return diagnostic tests.
8. `GET /api/consultation/doctors` and `GET /api/consultation/doctors/:id` should return doctors.
9. `POST /api/ordering/orders` with `{"items":[{"medicineId":"med-001","quantity":2}]}` should create an order.
10. `GET /api/wearables/google-fit/status` should return connection state.
11. `GET /api/wearables/google-fit/summary` should return normalized activity for Harshavardhana.
12. `POST /api/wearables/google-fit/sync` should accept wearable sync metrics.
13. `GET /api/notifications/history` should return notification history.
14. Configure Google/Firebase credentials before testing live production integrations.

