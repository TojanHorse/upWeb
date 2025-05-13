const mongoose = require('mongoose');
const { Schema } = mongoose;

const monitorCheckSchema = new Schema({
    monitor: {
        type: Schema.Types.ObjectId,
        ref: 'Monitor',
        required: true
    },
    website: {
        type: Schema.Types.ObjectId,
        ref: 'Website', 
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },
    success: {
        type: Boolean,
        required: true
    },
    statusCode: {
        type: Number,
        default: null
    },
    responseTime: {
        type: Number, // in milliseconds
        default: null
    },
    errorMessage: {
        type: String,
        default: null
    },
    location: {
        type: String,
        required: true
    },
    performedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    incidentCreated: {
        type: Boolean,
        default: false
    },
    paymentProcessed: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create indexes for faster queries
monitorCheckSchema.index({ monitor: 1, timestamp: -1 });
monitorCheckSchema.index({ website: 1, timestamp: -1 });
monitorCheckSchema.index({ performedBy: 1, timestamp: -1 });
monitorCheckSchema.index({ paymentProcessed: 1 });

const MonitorCheck = mongoose.model('MonitorCheck', monitorCheckSchema);

module.exports = { MonitorCheck }; 