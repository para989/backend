const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GroupSchema = new Schema({
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

GroupSchema.index({'url': 1}, {unique: true});
GroupSchema.index({'parent': 1});
GroupSchema.index({'stickers': 1});
GroupSchema.index({'order': 1});
GroupSchema.index({'name': 'text', 'description': 'text'}, {name: 'search'});

module.exports = mongoose.model('Group', GroupSchema);
