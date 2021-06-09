const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GiftSchema = new Schema({
    active: {
        $type: mongoose.Schema.Types.Boolean,
        default: true,
    },
    name: {
        $type: mongoose.Schema.Types.String,
        required: true,
    },
    description: {
        $type: mongoose.Schema.Types.String,
        required: true,
    },
    message: {
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
    quantity: {
        $type: mongoose.Schema.Types.Number,
        required: true,
    },
    products: {
        $type: [
            mongoose.Schema.Types.ObjectId,
        ],
        required: true,
    },
    gifts: {
        $type: [
            mongoose.Schema.Types.ObjectId,
        ],
        required: true,
    },
    order: {
        $type: mongoose.Schema.Types.Number,
        default: function () {
            return Math.ceil(new Date().getTime() / 1000);
        },
    },
}, {
    collection: 'gifts',
    typeKey: '$type',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

GiftSchema.index({'active': 1, 'places': 1});

module.exports = mongoose.model('Gift', GiftSchema);