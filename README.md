# ReLifeX Backend

Backend API for the ReLifeX wellness application.

## Overview

The backend currently handles:

- Authentication & JWT
- User onboarding
- Daily health tracking
- Fitness & workout tracking
- Medicine management
- Habits & streaks
- Health records
- Redis and scheduled tasks

## Project Structure

```text
backend/
├── src/
│   ├── config/          # Database & Redis configuration
│   ├── controllers/     # API request handling
│   ├── middleware/      # Authentication & error handling
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   └── app.js           # Express application
│
├── server.js            # Server entry point
├── package.json         # Dependencies & scripts
├── .env.example         # Environment variables template
└── .gitignore
```

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Pavankumar06T/Relifx-v2.git
cd Relifx-v2
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create `.env`

Create a `.env` file in the backend root.

Use `.env.example` as a reference.

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
REDIS_URL=your_redis_url
```

> **Important:** Never commit `.env` to GitHub.

### 4. Run the Backend

For development:

```bash
npm run dev
```

For normal execution:

```bash
npm start
```

The server will run at:

```text
http://localhost:5000
```

## API Modules

| Module | Description |
|---|---|
| `/api/auth` | Registration & Login |
| `/api/profile` | User onboarding |
| `/api/health` | Daily health & fitness tracking |
| `/api/medicine` | Medicine management |
| `/api/health/habits` | Habits & streaks |
| `/api/health/records` | Health records |

## Development Workflow

Switch to the integration branch:

```bash
git switch integration
git pull origin integration
```

After making changes:

```bash
git add .
git commit -m "describe your changes"
git push origin integration
```

## Testing

Use **Postman** to test the APIs.

For protected APIs, login first and use the returned JWT token:

```text
Authorization: Bearer <JWT_TOKEN>
```

## Team Integration

Individual work is developed on separate branches and combined into the `integration` branch for testing.

```text
Individual Branches
        ↓
   integration
        ↓
   Testing
        ↓
 Final Main Branch
```
