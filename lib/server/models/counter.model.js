const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    place: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    year: {
        type: mongoose.Schema.Types.Number,
        required: true,
    },
    month: {
        type: mongoose.Schema.Types.Number,
        required: true,
    },
    counter: {
        type: mongoose.Schema.Types.Number,
        default: 0,
    },
}, {
    collection: 'counters',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({place: 1, year: 1, month: 1});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Counter', schema);
