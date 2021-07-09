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
    from: {
        type: mongoose.Schema.Types.String,
        enum: ['app', 'site'],
        required: true,
    },
    phone: Schema.Types.String,
    place: mongoose.Schema.Types.ObjectId,
}, {
    collection: 'support',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

module.exports = mongoose.model('Support', SupportSchema);
