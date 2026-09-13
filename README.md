ReLifeX Backend

Backend API for the ReLifeX wellness application built using Node.js, Express.js, MongoDB, JWT, Redis and related backend services.

Overview

The backend currently includes:

User Registration & Login
JWT Authentication
User Onboarding
Daily Health Tracking
Fitness / Workout Tracking
Medicine Management
Habit Management
Habit Check-ins & Streaks
Health Records
Redis support
Scheduled background tasks
Project Structure
backend/
│
├── src/
│   ├── config/          # Database & Redis configuration
│   ├── controllers/     # Request handling
│   ├── middleware/      # Authentication & error handling
│   ├── models/          # MongoDB/Mongoose models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   └── app.js           # Express application
│
├── server.js            # Server entry point
├── package.json         # Dependencies & scripts
├── .env.example         # Environment variables template
└── .gitignore
Setup
1. Clone the repository
git clone https://github.com/Pavankumar06T/Relifx-v2.git
cd Relifx-v2
2. Install dependencies
npm install
3. Create .env

Create a .env file in the backend root and add the required environment variables.

Use .env.example as the reference.

PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
REDIS_URL=your_redis_url

Do not commit .env to GitHub.

4. Run the server

For development:

npm run dev

Or:

npm start

The backend will run at:

http://localhost:5000
API

Main API groups:

/api/auth              # Authentication
/api/profile           # User onboarding
/api/health            # Daily health & fitness
/api/medicine          # Medicine
/api/health/habits     # Habits & streaks
/api/health/records    # Health records

API testing can be done using Postman.

Development Workflow

Work on your assigned branch or the integration branch as instructed.

Before working:

git pull

After making changes:

git add .
git commit -m "describe your changes"
git push

For integration work:

git switch integration
git pull origin integration
