const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    type: {
        $type: mongoose.Schema.Types.String,
        enum: ['global', 'place', 'product', 'season', 'user', 'review'],
        required: true,
    },
    from: {
        $type: mongoose.Schema.Types.String,
        enum: ['app', 'site', 'office'],
        required: true,
    },
    author: {
        $type: mongoose.Schema.Types.ObjectId,
        ref: function () {
            return this.from === 'office' ? 'User' : 'Customer';
        },
        required: true,
    },
    object: {
        $type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    message: {
        $type: mongoose.Schema.Types.String,
        required: true,
    },
    rating: {
        $type: mongoose.Schema.Types.Number,
        enum: [1, 2, 3, 4, 5],
        required: true,
    },
    active: {
        $type: mongoose.Schema.Types.Boolean,
        default: true,
    },
    place: {
        $type: mongoose.Schema.Types.ObjectId,
    },
    photos: {
        $type: [{
            picture: mongoose.Schema.Types.String,
            width: mongoose.Schema.Types.Number,
            height: mongoose.Schema.Types.Number,
        }],
        default: undefined,
    },
}, {
    collection: 'reviews',
    typeKey: '$type',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'type': 1, 'object': 1});
schema.index({'created': -1});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Review', schema);
