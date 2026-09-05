# ReLifeX — Anurag Workstream Consolidated Technical Documentation

## Executive Overview
This document consolidates the complete architecture, API contracts, data models, integration adapters, deployment runbooks, and Play Console release configurations implemented under **Anurag's workstream** for the ReLifeX healthcare platform.

---

## 1. System Architecture & Workstream Boundaries

```
                 +---------------------------------------------+
                 |            ReLifeX Client App               |
                 +---------------------------------------------+
                        |                      |
    Google OAuth / Sync |                      | REST API + Bearer JWT
                        v                      v
         +---------------------------------------------------------+
         |           Anurag Workstream Integration Service         |
         +---------------------------------------------------------+
         |  * Wearables (Google Fit)      * Medicine Ordering API  |
         |  * Diagnostics Mock            * Consultation Mock      |
         |  * FCM Notification Adapter    * Cart & Orders Engine   |
         +---------------------------------------------------------+
             |               |                |               |
             v               v                v               v
     +---------------+ +-----------+  +---------------+ +---------------+
     |  Google Fit   | |  MongoDB  |  | Firebase FCM  | | Harshavardhana|
     |  Fitness API  | | Database  |  | Push Gateway  | | Fitness Module|
     +---------------+ +-----------+  +---------------+ +---------------+
```

### Scope Boundaries:
- **Anurag**: Google Fit integration, Medicine catalog & Cart/Order placement, Diagnostics mock API, Doctor Consultation mock API, FCM event adapter & workout nudges, CI/CD, Deployment on Render/AWS, and Play Console staged rollout configuration.
- **Dhanajayan (Handoff)**: Core user authentication, identity service, and shared auth middleware.
- **Harshavardhana (Handoff)**: Habit Engine and Fitness tracking algorithm consuming wearable summaries.
- **Pavan (Handoff)**: AI medical insight engine triggering notification events.

---

## 2. Comprehensive API Directory

### 2.1 Health & Database Status
- `GET /api/health`
  - Returns service status, UTC timestamp, and real-time MongoDB connection state (`connected`, `disconnected`, `connecting`).

### 2.2 Google Fit (Wearables)
- `GET /api/wearables/google-fit/connect`
  - Generates Google OAuth consent URL with fitness scopes (activity, location, body, heart rate, sleep).
- `GET /api/wearables/google-fit/callback?code=...&state=...`
  - Exchanges authorization code for refresh/access tokens and saves to MongoDB `GoogleFitToken`.
- `GET /api/wearables/google-fit/status`
  - Returns connection state, token expiration, authorized scopes, and last update time.
- `POST /api/wearables/google-fit/disconnect`
  - Revokes OAuth credentials and deletes tokens from MongoDB.
- `GET /api/wearables/google-fit/activity?startTimeMillis=...&endTimeMillis=...`
  - Aggregates daily steps, calories burned, and distance (with offline mock fallback).
- `GET /api/wearables/google-fit/workouts?startTimeMillis=...&endTimeMillis=...`
  - Retrieves workout sessions (Walking, Running, HIIT, Yoga, Cycling, Strength Training).
- `GET /api/wearables/google-fit/summary`
  - Normalized daily wearable payload proposal consumed by Harshavardhana's Fitness module.
- `POST /api/wearables/google-fit/fitness-stream`
  - Ingests and streams wearable activity and workout metrics into Harshavardhana's module.
- `POST /api/wearables/google-fit/sync`
  - Accepts manual or client-side fitness metrics for local frontend testing.

### 2.3 Medicine Ordering & Cart
- `GET /api/ordering/medicines`
  - Dual-mode catalog lookup from MongoDB or fallback seed data; supports `?q=` and `?category=`.
- `GET /api/ordering/medicines/:id`
  - Single medicine details.
- `GET /api/ordering/cart`
  - View authenticated user's cart, item counts, and computed subtotal.
- `POST /api/ordering/cart/items`
  - Add medicine item to cart (`{ medicineId, quantity }`).
- `PATCH /api/ordering/cart/items/:medicineId`
  - Update item quantity in cart (`{ quantity }`). Setting quantity to 0 removes item.
- `DELETE /api/ordering/cart/items/:medicineId`
  - Remove item from cart.
- `DELETE /api/ordering/cart`
  - Clear user's entire cart.
- `POST /api/ordering/cart/checkout`
  - Converts user's current cart into an `Order` saved in ReLifeX's database and empties cart.
- `POST /api/ordering/orders`
  - Direct order placement with `{ items: [{ medicineId, quantity }] }`.
- `GET /api/ordering/orders`
  - Retrieve authenticated user's order history.
- `GET /api/ordering/orders/:id`
  - Retrieve single order details.
- `POST /api/ordering/orders/:id/cancel`
  - Cancel an existing placed order.

### 2.4 Diagnostics (Mock Backend)
- `GET /api/diagnostics`
  - List available diagnostic test catalog.
- `GET /api/diagnostics/:id`
  - Single diagnostic test detail.
- `POST /api/diagnostics/bookings`
  - Book a diagnostic test (`{ diagnosticId, slot }`).
- `GET /api/diagnostics/bookings/my`
  - List user's diagnostic bookings.
- `GET /api/diagnostics/bookings/:id`
  - Retrieve single booking details.
- `POST /api/diagnostics/bookings/:id/cancel`
  - Cancel diagnostic appointment.
- `GET /api/diagnostics/bookings/:id/report`
  - Demo sample lab test results report with reference ranges and clinical interpretations.

### 2.5 Doctor Consultation (Mock Backend)
- `GET /api/consultation/doctors`
  - List doctor profiles with specialties, experience, and consultation fees.
- `GET /api/consultation/doctors/:id`
  - Single doctor profile lookup.
- `POST /api/consultation/bookings`
  - Book consultation appointment (`{ doctorId, slot }`).
- `GET /api/consultation/bookings/my`
  - List user's consultation bookings.
- `GET /api/consultation/bookings/:id`
  - Retrieve single appointment details.
- `POST /api/consultation/bookings/:id/cancel`
  - Cancel doctor consultation appointment.
- `GET /api/consultation/bookings/:id/join`
  - Telehealth demo room join endpoint returning room URL, meeting token, and room status.

### 2.6 Firebase Cloud Messaging & Workout Nudges
- `POST /api/notifications/push`
  - Dispatch direct push notifications (`{ token, title, body, data }`).
- `POST /api/notifications/events`
  - Event adapter for `HABIT_REMINDER`, `INSIGHT_READY`, `MEDICATION_DUE`, `WORKOUT_NUDGE`, `INACTIVITY_ALERT`, and `GOAL_ACHIEVED`.
- `POST /api/notifications/nudges/workout`
  - Dedicated workout nudge endpoint.
- `GET /api/notifications/history`
  - Dispatched notification audit logs retrieved from MongoDB.

---

## 3. Database Schema Models

1. **`Order`** (`src/models/Order.js`):
   - `userId`: String (indexed)
   - `items`: Array of `{ medicineId: String, name: String, quantity: Number, unitPrice: Number }`
   - `total`: Number
   - `status`: String (`PLACED`, `CANCELLED`)

2. **`Cart`** (`src/models/Cart.js`):
   - `userId`: String (unique, indexed)
   - `items`: Array of `{ medicineId: String, name: String, quantity: Number, unitPrice: Number }`

3. **`Booking`** (`src/models/Booking.js`):
   - `userId`: String (indexed)
   - `type`: String (`DIAGNOSTIC`, `CONSULTATION`)
   - `providerId`: String
   - `providerName`: String
   - `serviceName`: String
   - `slot`: String
   - `status`: String (`BOOKED`, `CANCELLED`)

4. **`Medicine`** (`src/models/Medicine.js`):
   - `name`, `genericName`, `strength`, `form`, `category`, `price`, `stock`, `prescriptionRequired`

5. **`GoogleFitToken`** (`src/models/GoogleFitToken.js`):
   - `userId`: String (unique, indexed)
   - `accessToken`, `refreshToken`, `expiryDate`, `scope`, `tokenType`

6. **`NotificationLog`** (`src/models/NotificationLog.js`):
   - `userId`, `title`, `body`, `token`, `eventType`, `delivered`, `mode`, `metadata`

---

## 4. Deployment & DevOps Architecture

- **Containerization**: [`Dockerfile`](file:///c:/Users/anura/Downloads/anurag_relifex_code/anurag_relifex/Dockerfile) multi-stage Node 20 alpine runner.
- **Render Infrastructure as Code**: [`render.yaml`](file:///c:/Users/anura/Downloads/anurag_relifex_code/anurag_relifex/render.yaml) blueprint.
- **GitHub Actions CI/CD**:
  - [`.github/workflows/ci.yml`](file:///c:/Users/anura/Downloads/anurag_relifex_code/anurag_relifex/.github/workflows/ci.yml): Linting and unit tests on pull requests.
  - [`.github/workflows/staged-release.yml`](file:///c:/Users/anura/Downloads/anurag_relifex_code/anurag_relifex/.github/workflows/staged-release.yml): Staged staging/production deployment pipeline.
  - [`.github/workflows/play-console-release.yml`](file:///c:/Users/anura/Downloads/anurag_relifex_code/anurag_relifex/.github/workflows/play-console-release.yml): Automated Android App Bundle deployment to Google Play Console.
- **Play Console Configuration**: [`play-console/track-config.json`](file:///c:/Users/anura/Downloads/anurag_relifex_code/anurag_relifex/play-console/track-config.json) staged rollout schedule (10% → 25% → 50% → 100%).
