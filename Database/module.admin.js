const mongoose = require('mongoose');
const { Schema } = mongoose;

const adminSchema = new Schema({
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
    role: {
        type: String,
        enum: ['super', 'regular'],
        default: 'regular'
    },
    isEmailVerified: {
        type: Boolean,
        default: true // Admins are verified by default
    },
    verificationCode: {
        type: String,
        default: null
    },
    verificationCodeExpires: {
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
    resetToken: {
        type: String,
        default: null
    },
    resetTokenExpires: {
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
    }
});

const Admin = mongoose.model('Admin', adminSchema);

module.exports = { Admin };
