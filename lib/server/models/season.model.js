const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SeasonSchema = new Schema({
    active: {
        $type: mongoose.Schema.Types.Boolean,
        default: true,
    },
    name: {
        $type: mongoose.Schema.Types.String,
        required: true,
    },
    description: mongoose.Schema.Types.String,
    picture: {
        $type: mongoose.Schema.Types.String,
        required: true,
    },
    duration: {
        $type: mongoose.Schema.Types.Number,
        required: true,
    },
    price: {
        $type: mongoose.Schema.Types.Number,
        required: true,
    },
    amount: {
        $type: mongoose.Schema.Types.Number,
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
    products: {
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
    collection: 'seasons',
    typeKey: '$type',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

SeasonSchema.index({'active': 1, 'places': 1});
SeasonSchema.index({'active': 1, 'placement': 1});

module.exports = mongoose.model('Season', SeasonSchema);
