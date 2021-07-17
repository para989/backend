const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    active: {
        $type: mongoose.Schema.Types.Boolean,
        default: true,
    },
    name: {
        $type: mongoose.Schema.Types.String,
        required: true,
    },
    type: {
        $type: mongoose.Schema.Types.String,
        required: true,
    },
    placement: {
        $type: mongoose.Schema.Types.String,
        enum: ['everywhere', 'site', 'app'],
        default: 'everywhere',
    },
    places: {
        $type: [
            mongoose.Schema.Types.ObjectId,
        ],
        default: undefined,
    },
    params: mongoose.Schema.Types.Mixed,
    test: {
        $type: mongoose.Schema.Types.Boolean,
        default: false,
    },
    order: {
        $type: mongoose.Schema.Types.Number,
        default: function () {
            return Math.ceil(new Date().getTime() / 1000);
        },
    },
}, {
    collection: 'payment-methods',
    typeKey: '$type',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'type': 1, 'test': 1}, {unique: true});
schema.index({'active': 1, 'placement': 1, 'test': 1});
schema.index({'order': 1});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('PaymentMethod', schema);
