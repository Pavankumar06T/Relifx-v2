const { createClient } = require("redis");

let redisClient = null;

async function connectRedis() {
    const url = process.env.REDIS_URL;
    if (!url) {
        console.warn("REDIS_URL is not configured; streak cache will use MongoDB only.");
        return null;
    }

    redisClient = createClient({ url });
    redisClient.on("error", (error) => console.error("Redis error", error.message));
    await redisClient.connect();
    console.log("Redis connected");
    return redisClient;
}

function getRedisClient() {
    return redisClient && redisClient.isOpen ? redisClient : null;
}

module.exports = { connectRedis, getRedisClient };
