require("dotenv").config();

const app = require("./app");
const { connectDatabase } = require("./config/database");
const { connectRedis } = require("./config/redis");
const { scheduleDailyStreakMaintenance } = require("./services/streakService");

const PORT = process.env.PORT || 5000;

async function start() {
    await connectDatabase();
    await connectRedis();
    scheduleDailyStreakMaintenance();

    app.listen(PORT, () => {
        console.log(`ReLifeX Health Service running on port ${PORT}`);
    });
}

start().catch((error) => {
    console.error("Unable to start ReLifeX Health Service", error);
    process.exit(1);
});
