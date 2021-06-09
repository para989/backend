const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const ProductSchema = new Schema({
    url: {
        $type: mongoose.Schema.Types.String,
        required: true,
    },
    groups: {
        $type: [
            mongoose.Schema.Types.ObjectId,
        ],
        required: true,
    },
    active: {
        $type: mongoose.Schema.Types.Boolean,
        default: true,
    },
    order: {
        $type: mongoose.Schema.Types.Number,
        default: function () {
            return Math.ceil(new Date().getTime() / 1000);
        },
    },
    rating: {
        $type: mongoose.Schema.Types.Number,
        default: 0,
    },
    score: {
        $type: mongoose.Schema.Types.Number,
        default: 0,
    },
    code: mongoose.Schema.Types.String,
    name: {
        $type: mongoose.Schema.Types.String,
        required: true,
    },
    description: mongoose.Schema.Types.String,
    gallery: {
        $type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    hit: {
        $type: mongoose.Schema.Types.Boolean,
        default: false,
    },
    additional: {
        $type: mongoose.Schema.Types.Boolean,
        default: false,
    },
    words: mongoose.Schema.Types.String,
    relations: {
        $type: [
            mongoose.Schema.Types.ObjectId,
        ],
        default: undefined,
    },
    purchases: {
        $type: mongoose.Schema.Types.Number,
        default: 0,
    },
    reviews: {
        $type: mongoose.Schema.Types.Number,
        default: 0,
    },
    stickers: {
        $type: [{
            _id: mongoose.Schema.Types.ObjectId,
            name: mongoose.Schema.Types.String,
            color: {
                color: mongoose.Schema.Types.String,
                hex: mongoose.Schema.Types.String,
            }
        }],
        default: undefined,
    },
    ingredients: {
        $type: [
            mongoose.Schema.Types.ObjectId,
        ],
        default: undefined,
    },
    modifiers: {
        $type: [
            mongoose.Schema.Types.ObjectId,
        ],
        default: undefined,
    },
    prices: {
        $type: mongoose.Schema.Types.Mixed,
        required: true,
    },
}, {
    collection: 'products',
    typeKey: '$type',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

ProductSchema.index({'url': 1}, {unique: true});
ProductSchema.index({'active': 1});
ProductSchema.index({'additional': 1});
ProductSchema.index({'groups': 1});
ProductSchema.index({'stickers': 1});
ProductSchema.index({'modifiers': 1});
ProductSchema.index({'ingredients': 1});
ProductSchema.index({'relations': 1});
ProductSchema.index({'name': 1});
ProductSchema.index({'order': 1});
ProductSchema.index({'purchases': -1});
ProductSchema.index({'rating': -1});
ProductSchema.index({'prices.code': 1});
ProductSchema.index({'prices.price': 1});
ProductSchema.index({'prices.price': -1});
ProductSchema.index({'words': 'text'}, {name: 'search'});

module.exports = mongoose.model('Product', ProductSchema);
