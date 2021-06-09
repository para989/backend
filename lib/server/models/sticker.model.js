const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StickerSchema = new Schema({
    order: {
        $type: mongoose.Schema.Types.Number,
        default: function () {
            return Math.ceil(new Date().getTime() / 1000);
        },
    },
    name: {
        $type: mongoose.Schema.Types.String,
        required: true,
    },
    color: {
        $type: {
            color: mongoose.Schema.Types.String,
            hex: mongoose.Schema.Types.String,
        },
        required: true,
    },
}, {
    collection: 'stickers',
    typeKey: '$type',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

StickerSchema.index({'order': 1});

module.exports = mongoose.model('Sticker', StickerSchema);
