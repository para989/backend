const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EmailSchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    email: {
        type: Schema.Types.String,
        required: true
    },
    verify: {
        type: Schema.Types.Boolean,
        default: false
    },
}, {
    collection: 'emails',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

EmailSchema.index({'user': 1, 'email': 1});

module.exports = mongoose.model('Email', EmailSchema);
