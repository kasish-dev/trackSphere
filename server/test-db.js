const mongoose = require('mongoose');
require('dotenv').config();

const testConn = async () => {
    try {
        let uri = process.env.MONGO_URI;
        if (uri) uri = uri.trim();
        
        console.log('--- DB Connection Test ---');
        console.log('URI used (masked):', uri ? uri.replace(/:([^@]+)@/, ':****@') : 'MISSING');
        
        // Try connecting
        await mongoose.connect(uri);
        
        console.log('✅ SUCCESS: Connected to MongoDB Atlas!');
        process.exit(0);
    } catch (err) {
        console.error('❌ FAILURE');
        console.error('Code:', err.code);
        console.error('Message:', err.message);
        process.exit(1);
    }
};

testConn();
