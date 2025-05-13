const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentSchema = new Schema({
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'USD'
    },
    type: {
        type: String,
        enum: ['deposit', 'withdrawal', 'transfer', 'payment'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'cancelled'],
        default: 'pending'
    },
    sender: {
        type: Schema.Types.ObjectId,
        refPath: 'senderType',
        required: true
    },
    senderType: {
        type: String,
        enum: ['User', 'Admin', 'Contributor'],
        required: true
    },
    receiver: {
        type: Schema.Types.ObjectId,
        refPath: 'receiverType',
        required: true
    },
    receiverType: {
        type: String,
        enum: ['User', 'Admin', 'Contributor'],
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    website: {
        type: Schema.Types.ObjectId,
        ref: 'Website',
        required: function() {
            return this.type === 'payment';
        }
    },
    transactionId: {
        type: String,
        unique: true
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

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = { Payment };
