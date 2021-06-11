const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PromoCodeSchema = new Schema({
    type: {
        $type: mongoose.Schema.Types.String,
        enum: ['percent', 'fixed'],
        required: true
    },
    code: {
        $type: mongoose.Schema.Types.String,
        required: true,
    },
    amount: {
        $type: mongoose.Schema.Types.Number,
        required: true,
    },
    active: {
        $type: mongoose.Schema.Types.Boolean,
        default: true,
    },
    description: mongoose.Schema.Types.String,
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
    products: {
        $type: [
            mongoose.Schema.Types.ObjectId,
        ],
        default: undefined,
    },
    once: {
        $type: mongoose.Schema.Types.Boolean,
        default: false,
    },
    period: {
        type: {
            $type: mongoose.Schema.Types.String,
            enum: ['always', 'till', 'range', 'multiple']
        },
        dates: [
            mongoose.Schema.Types.String
        ],
        start: mongoose.Schema.Types.String,
        end: mongoose.Schema.Types.String
    },
    order: {
        $type: mongoose.Schema.Types.Number,
        default: function () {
            return Math.ceil(new Date().getTime() / 1000);
        },
    },
}, {
    collection: 'promocodes',
    typeKey: '$type',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

PromoCodeSchema.index({'active': 1, 'places': 1});

module.exports = mongoose.model('PromoCode', PromoCodeSchema);
