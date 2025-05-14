const mongoose = require('mongoose');
const { Schema } = mongoose;

const contributorSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    expertise: {
        type: [String],
        default: []
    },
    bio: {
        type: String,
        default: ''
    },
    profilePicture: {
        type: String,
        default: ''
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    verificationCode: {
        type: String,
        default: null
    },
    verificationCodeExpires: {
        type: Date,
        default: null
    },
    verificationToken: {
        type: String,
        default: null
    },
    verificationTokenExpires: {
        type: Date,
        default: null
    },
    verificationOTP: {
        type: String,
        default: null
    },
    verificationOTPExpires: {
        type: Date,
        default: null
    },
    resetCode: {
        type: String,
        default: null
    },
    resetCodeExpires: {
        type: Date,
        default: null
    },
    verificationAttempts: {
        type: Number,
        default: 0
    },
    lastVerificationAttempt: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    clerkId: {
        type: String,
        unique: true,
        sparse: true
    }
});

const Contributor = mongoose.model('Contributor', contributorSchema);

module.exports = { Contributor };
