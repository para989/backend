const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    url: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    name: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    picture: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    parent: mongoose.Schema.Types.ObjectId,
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
    description: mongoose.Schema.Types.String,
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
    schedule: mongoose.Schema.Types.Mixed,
    countGroups: {
        type: mongoose.Schema.Types.Number,
        default: 0,
    },
    countProducts: {
        type: mongoose.Schema.Types.Number,
        default: 0,
    },
}, {
    collection: 'groups',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'active': 1});
schema.index({'url': 1}, {unique: true});
schema.index({'parent': 1});
schema.index({'stickers': 1});
schema.index({'order': 1});
schema.index({'name': 'text', 'description': 'text'}, {name: 'search'});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Group', schema);
