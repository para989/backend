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
    description: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    message: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    placement: {
        type: mongoose.Schema.Types.String,
        enum: ['everywhere', 'site', 'app'],
        default: 'everywhere',
    },
    icon: mongoose.Schema.Types.String,
    places: {
        type: [
            mongoose.Schema.Types.ObjectId,
        ],
        default: undefined,
    },
    quantity: {
        type: mongoose.Schema.Types.Number,
        required: true,
    },
    products: {
        type: [
            mongoose.Schema.Types.ObjectId,
        ],
        required: true,
    },
    gifts: {
        type: [
            mongoose.Schema.Types.ObjectId,
        ],
        required: true,
    },
    order: {
        type: mongoose.Schema.Types.Number,
        default: function () {
            return Math.ceil(new Date().getTime() / 1000);
        },
    },
}, {
    collection: 'gifts',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'active': 1, 'places': 1, 'placement': 1});
schema.index({'order': 1});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Gift', schema);
