const mongoose = require('mongoose');
const { Schema } = mongoose;

const contributorWalletSchema = new Schema({
    contributor: {
        type: Schema.Types.ObjectId,
        ref: 'Contributor',
        required: true,
        unique: true
    },
    balance: {
        type: Number,
        default: 0,
        min: 0
    },
    currency: {
        type: String,
        default: 'USD'
    },
    transactions: [{
        type: Schema.Types.ObjectId,
        ref: 'Payment'
    }],
    payoutMethod: {
        type: String,
        enum: ['bank', 'paypal', 'crypto'],
        default: 'bank'
    },
    payoutDetails: {
        type: Object,
        default: {}
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

const ContributorWallet = mongoose.model('ContributorWallet', contributorWalletSchema);

module.exports = { ContributorWallet };
