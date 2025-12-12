const mongoose = require('mongoose');

const documentCommentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true
    },
    document: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    position: {
        line: Number,
        index: Number
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('DocumentComment', documentCommentSchema);

