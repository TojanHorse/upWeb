const mongoose = require('mongoose');
const { Schema } = mongoose;

const monitorSchema = new Schema({
    website: {
        type: Schema.Types.ObjectId,
        ref: 'Website',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    url: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['http', 'https', 'tcp', 'ping', 'dns', 'ssl'],
        default: 'https'
    },
    interval: {
        type: Number, // in seconds
        default: 300, // 5 minutes
        min: 60 // minimum 1 minute
    },
    timeout: {
        type: Number, // in milliseconds
        default: 30000 // 30 seconds
    },
    alertThreshold: {
        type: Number, // number of consecutive failures before alert
        default: 1
    },
    locations: [{
        type: String,
        enum: ['us-east', 'us-west', 'eu-central', 'ap-south', 'ap-east']
    }],
    expectedStatusCode: {
        type: Number,
        default: 200
    },
    active: {
        type: Boolean,
        default: true
    },
    alertContacts: [{
        type: String, // email or phone number
        required: true
    }],
    statusPagePublic: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const Monitor = mongoose.model('Monitor', monitorSchema);

module.exports = { Monitor }; 