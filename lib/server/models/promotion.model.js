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
    description: {
        $type: mongoose.Schema.Types.String,
        required: true,
    },
    text: mongoose.Schema.Types.String,
    picture: {
        $type: mongoose.Schema.Types.String,
        required: true,
    },
    banner: {
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
    content: {
        $type: {
            type: mongoose.Schema.Types.String,
            value: mongoose.Schema.Types.String,
        },
        default: undefined,
    },
    order: {
        $type: mongoose.Schema.Types.Number,
        default: function () {
            return Math.ceil(new Date().getTime() / 1000);
        },
    },
}, {
    collection: 'promotions',
    typeKey: '$type',
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

module.exports = mongoose.model('Promotion', schema);
