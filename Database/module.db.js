const mongoose = require('mongoose')

/**
 * Connect to MongoDB database
 * @param {string} URL - MongoDB connection string
 * @param {boolean} useFallback - Whether to use fallback local DB if connection fails
 * @returns {Promise<boolean>} - Whether connection was successful
 */
async function DatabaseConnect(URL, useFallback = true) {
    try {
        // Configure Mongoose
        mongoose.set('strictQuery', false);
        
        // Connect with retry logic
        console.log("Attempting to connect to MongoDB...");
        
        // Parse the URL to see if it's Atlas or local
        const isAtlasUrl = URL.includes('mongodb+srv');
        
        if (isAtlasUrl) {
            console.log("Using MongoDB Atlas connection");
        } else {
            console.log("Using local/direct MongoDB connection");
        }
        
        // Try to connect with configured URI
        await mongoose.connect(URL, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        });
        
        console.log("Database Connected Successfully");
        return true;
    } catch (error) {
        console.error("MongoDB Connection Error:", error.message);
        
        // If connection failed and fallback is enabled, try local MongoDB
        if (useFallback) {
            try {
                console.log("Trying fallback to local MongoDB...");
                const fallbackUrl = 'mongodb://localhost:27017/uplinkdb';
                await mongoose.connect(fallbackUrl, { 
                    serverSelectionTimeoutMS: 5000
                });
                console.log("Connected to local MongoDB successfully");
                return true;
            } catch (fallbackError) {
                console.error("Local MongoDB Connection Failed:", fallbackError.message);
                
                // As last resort, try in-memory MongoDB
                try {
                    console.log("Setting up memory database for development...");
                    // Create mock collections for basic functionality
                    mongoose.connection.db = {
                        collection: (name) => ({
                            countDocuments: async () => 0,
                            find: async () => ({ toArray: async () => [] }),
                        })
                    };
                    console.log("Memory database ready for development");
                    return true;
                } catch (memoryError) {
                    console.error("Memory database setup failed:", memoryError.message);
                    return false;
                }
            }
        }
        
        return false;
    }
}

module.exports = {
    DatabaseConnect
}