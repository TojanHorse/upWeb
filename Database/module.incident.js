const mongoose = require('mongoose');
const { Schema } = mongoose;

const incidentSchema = new Schema({
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
    startTime: {
        type: Date,
        default: Date.now,
        required: true
    },
    endTime: {
        type: Date,
        default: null
    },
    duration: {
        type: Number, // in seconds
        default: 0
    },
    status: {
        type: String,
        enum: ['ongoing', 'resolved', 'acknowledged'],
        default: 'ongoing'
    },
    type: {
        type: String,
        enum: ['downtime', 'performance', 'ssl', 'dns', 'other'],
        default: 'downtime'
    },
    reason: {
        type: String,
        default: ''
    },
    responseTime: {
        type: Number, // in milliseconds
        default: 0
    },
    statusCode: {
        type: Number,
        default: 0
    },
    location: {
        type: String,
        required: true
    },
    notes: [{
        text: String,
        createdBy: {
            type: Schema.Types.ObjectId,
            refPath: 'createdByType'
        },
        createdByType: {
            type: String,
            enum: ['User', 'Admin', 'Contributor']
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const Incident = mongoose.model('Incident', incidentSchema);

module.exports = { Incident }; 