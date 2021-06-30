const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PromotionSchema = new Schema({
    active: {
        type: mongoose.Schema.Types.Boolean,
        default: true,
    },
    name: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    description: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    text: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    picture: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    banner: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    placement: {
        type: mongoose.Schema.Types.String,
        enum: ['everywhere', 'site', 'app'],
        default: 'everywhere',
    },
    places: {
        type: [
            mongoose.Schema.Types.ObjectId,
        ],
        default: undefined,
    },
    content: mongoose.Schema.Types.Mixed,
    order: {
        type: mongoose.Schema.Types.Number,
        default: function () {
            return Math.ceil(new Date().getTime() / 1000);
        },
    },
}, {
    collection: 'promotions',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

PromotionSchema.index({'active': 1, 'places': 1});

module.exports = mongoose.model('Promotion', PromotionSchema);
