const mongoose = require("mongoose");

async function connectDatabase() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.warn("MONGODB_URI is not configured; API database endpoints will be unavailable.");
        return;
    }

    await mongoose.connect(uri);
    console.log("MongoDB connected");
}

module.exports = { connectDatabase };
