const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const schema = new Schema({
    url: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    groups: {
        type: [
            mongoose.Schema.Types.ObjectId,
        ],
        required: true,
    },
    brand: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Brand',
    },
    active: {
        type: mongoose.Schema.Types.Boolean,
        default: true,
    },
    order: {
        type: mongoose.Schema.Types.Number,
        default: function () {
            return Math.ceil(new Date().getTime() / 1000);
        },
    },
    code: mongoose.Schema.Types.String,
    name: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    description: mongoose.Schema.Types.String,
    gallery: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    hit: {
        type: mongoose.Schema.Types.Boolean,
        default: false,
    },
    additional: {
        type: mongoose.Schema.Types.Boolean,
        default: false,
    },
    words: mongoose.Schema.Types.String,
    places: {
        type: [
            mongoose.Schema.Types.ObjectId,
        ],
        default: undefined,
    },
    relations: {
        type: [
            mongoose.Schema.Types.ObjectId,
        ],
        default: undefined,
    },

    purchases: {
        type: mongoose.Schema.Types.Number,
        default: 0,
    },

    rating: Schema.Types.Array,

    stickers: {
        type: [{
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
        type: [
            mongoose.Schema.Types.ObjectId,
        ],
        default: undefined,
    },
    modifiers: {
        type: [
            mongoose.Schema.Types.ObjectId,
        ],
        default: undefined,
    },
    prices: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
}, {
    collection: 'products',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'url': 1}, {unique: true});
schema.index({'active': 1, 'places': 1});
schema.index({'additional': 1});
schema.index({'groups': 1});
schema.index({'stickers': 1});
schema.index({'modifiers': 1});
schema.index({'ingredients': 1});
schema.index({'relations': 1});
schema.index({'name': 1});
schema.index({'prices.code': 1});
schema.index({'prices.price': 1});
schema.index({'prices.price': -1});
schema.index({'purchases': 1});
schema.index({'rating': 1});
schema.index({'words': 'text'}, {name: 'search'});
schema.index({'brand': 1});
schema.index({'order': 1});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Product', schema);
