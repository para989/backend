const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SupportSchema = new Schema({
    name: {
        type: Schema.Types.String,
        required: true
    },
    email: {
        type: Schema.Types.String,
        required: true
    },
    message: {
        type: Schema.Types.String,
        required: true
    },
    phone: Schema.Types.String,
    date: {
        type: mongoose.Schema.Types.Date,
        default: Date.now,
    },
}, {
    collection: 'support',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

module.exports = mongoose.model('Support', SupportSchema);
