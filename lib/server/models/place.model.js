const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
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
    brand: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Brand',
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
    test: Schema.Types.Boolean,
}, {
    collection: 'places',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'active': 1, 'test': 1});
schema.index({'purchases': 1});
schema.index({'rating': 1});
schema.index({'brand': 1});
schema.index({'order': 1});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Place', schema);
