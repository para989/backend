const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PaymentMethodSchema = new Schema({
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

PaymentMethodSchema.index({'type': 1, 'test': 1}, {unique: true});
PaymentMethodSchema.index({'placement': 1, 'test': 1});

module.exports = mongoose.model('PaymentMethod', PaymentMethodSchema);