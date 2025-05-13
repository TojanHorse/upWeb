const mongoose = require('mongoose');
const { Schema } = mongoose;

const userWalletSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
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
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const UserWallet = mongoose.model('UserWallet', userWalletSchema);

module.exports = { UserWallet };
