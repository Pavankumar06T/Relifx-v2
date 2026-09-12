import { createClient } from "redis";

// No equivalent exists yet in Dhanajayan's backend, so this is new shared
// infrastructure rather than a duplicate. When merged, mount this
// alongside his config/database.js in the shared server.js startup
// sequence. Habit streak summaries are cached here for 2 days
// (see streakService.js); MongoDB remains the durable source of truth
// if Redis is unavailable.
let redisClient = null;

async function connectRedis() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn("⚠️  [Redis Warning] REDIS_URL is not configured; streak cache will use MongoDB only.");
    return null;
  }

  redisClient = createClient({ url });
  redisClient.on("error", (error) => console.error("❌ [Redis Error]", error.message));
  await redisClient.connect();
  console.log("✅ [Redis] Connected");
  return redisClient;
}

function getRedisClient() {
  return redisClient && redisClient.isOpen ? redisClient : null;
}

export { connectRedis, getRedisClient };
