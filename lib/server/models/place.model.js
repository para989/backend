const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PlaceSchema = new Schema({
    active: {
        type: mongoose.Schema.Types.Boolean,
        default: true,
    },
    primary: {
        type: mongoose.Schema.Types.Boolean,
        default: false,
    },
    name: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    gallery: mongoose.Schema.Types.Mixed,
    city: {
        type: Schema.Types.ObjectId,
        ref: 'City',
        required: true,
    },
    address: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    coordinates: {
        type: {
            longitude: mongoose.Schema.Types.Number,
            latitude: mongoose.Schema.Types.Number,
        },
        required: true,
    },
    description: mongoose.Schema.Types.String,
    phone: mongoose.Schema.Types.String,
    email: mongoose.Schema.Types.String,
    delivery: {
        type: mongoose.Schema.Types.Boolean,
        default: false,
    },
    pickup: {
        type: mongoose.Schema.Types.Boolean,
        default: false,
    },
    inside: {
        type: mongoose.Schema.Types.Boolean,
        default: false,
    },
    schedule: mongoose.Schema.Types.Mixed,
    order: {
        type: mongoose.Schema.Types.Number,
        default: function () {
            return Math.ceil(new Date().getTime() / 1000);
        },
    },
}, {
    collection: 'places',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

PlaceSchema.index({'active': 1});

module.exports = mongoose.model('Place', PlaceSchema);
