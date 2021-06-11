const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    hash: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    string: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    date: {
        type: mongoose.Schema.Types.Date,
        default: Date.now,
    },
}, {
    collection: 'uniqueness',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({hash: 1});
schema.index({date: 1}, {expireAfterSeconds: 60});

module.exports = mongoose.model('Uniqueness', schema);
