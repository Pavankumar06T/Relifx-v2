# Integration Handoffs

## Dhanajayan → Anurag

- Final JWT/auth middleware
- Authenticated user identity contract
- Any rate-limit/security middleware that must wrap these routes

## Harshavardhana → Anurag

- Workout/activity schema consumed by Fitness
- Health Tracking/Habit events for notification triggers
- Final trigger names and payloads

## Pavan → Anurag

- AI insight event contract
- Notification timing/trigger semantics for insight-ready events

## Anurag → Harshavardhana

- Google Fit normalized activity payload proposal
- Availability of wearable data endpoint

## Anurag → Pavan

- Notification event adapter and delivery status
- Any external/integration data shape needed by insight triggers
