const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    active: {
        type: mongoose.Schema.Types.Boolean,
        default: true,
    },
    name: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    description: mongoose.Schema.Types.String,
    picture: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    duration: {
        type: mongoose.Schema.Types.Number,
        required: true,
    },
    price: {
        type: mongoose.Schema.Types.Number,
        required: true,
    },
    amount: {
        type: mongoose.Schema.Types.Number,
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
    products: {
        type: [
            mongoose.Schema.Types.ObjectId,
        ],
        required: true,
    },

    purchases: {
        type: mongoose.Schema.Types.Number,
        default: 0,
    },

    rating: Schema.Types.Array,

    order: {
        type: mongoose.Schema.Types.Number,
        default: function () {
            return Math.ceil(new Date().getTime() / 1000);
        },
    },
}, {
    collection: 'seasons',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'active': 1, 'places': 1});
schema.index({'active': 1, 'placement': 1});
schema.index({'purchases': 1});
schema.index({'rating': 1});
schema.index({'order': 1});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Season', schema);
