const mongoose = require('mongoose');
const { Schema } = mongoose;

const websiteSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    url: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    category: {
        type: String,
        required: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    contributors: [{
        type: Schema.Types.ObjectId,
        ref: 'Contributor'
    }],
    status: {
        type: String,
        enum: ['active', 'pending', 'inactive'],
        default: 'pending'
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

const Website = mongoose.model('Website', websiteSchema);

module.exports = { Website };
