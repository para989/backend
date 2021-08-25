const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    place: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Place',
    },
    name: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    active: {
        type: mongoose.Schema.Types.Boolean,
        default: true,
    },
    coordinates: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    waitingTime: {
        type: mongoose.Schema.Types.Number,
        default: 0,
    },
    costDelivery: {
        type: mongoose.Schema.Types.Number,
        default: 0,
    },
    freeDelivery: {
        type: mongoose.Schema.Types.Number,
        default: 0,
    },
    minimumAmount: {
        type: mongoose.Schema.Types.Number,
        default: 0,
    },
    description: mongoose.Schema.Types.String,
}, {
    collection: 'areas',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false,
});

schema.index({'place': 1});
schema.index({'order': 1});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Area', schema);
