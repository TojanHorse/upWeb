const mongoose = require('mongoose');
const { Schema } = mongoose;

const subscriptionSchema = new Schema({
    website: {
        type: Schema.Types.ObjectId,
        ref: 'Website',
        required: true
    },
    contributor: {
        type: Schema.Types.ObjectId,
        ref: 'Contributor',
        required: true
    },
    plan: {
        type: String,
        enum: ['basic', 'standard', 'premium'],
        default: 'basic'
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'USD'
    },
    interval: {
        type: String,
        enum: ['monthly', 'quarterly', 'yearly'],
        default: 'monthly'
    },
    status: {
        type: String,
        enum: ['active', 'cancelled', 'pending', 'expired'],
        default: 'pending'
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    autoRenew: {
        type: Boolean,
        default: true
    },
    monitors: [{
        type: Schema.Types.ObjectId,
        ref: 'Monitor'
    }],
    maxMonitors: {
        type: Number,
        default: 5
    },
    checkInterval: {
        type: Number, // in seconds
        default: 300 // 5 minutes
    },
    paymentHistory: [{
        paymentId: {
            type: Schema.Types.ObjectId,
            ref: 'Payment'
        },
        amount: Number,
        date: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['success', 'failed', 'pending'],
            default: 'pending'
        }
    }],
    razorpaySubscriptionId: {
        type: String,
        default: null
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

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = { Subscription }; 