const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CounterSchema = new Schema({
    place: {
        $type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    year: {
        $type: mongoose.Schema.Types.Number,
        required: true,
    },
    month: {
        $type: mongoose.Schema.Types.Number,
        required: true,
    },
    counter: {
        $type: mongoose.Schema.Types.Number,
        default: 0,
    },
}, {
    collection: 'counters',
    typeKey: '$type',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

CounterSchema.index({place: 1, year: 1, month: 1});

module.exports = mongoose.model('Counter', CounterSchema);
