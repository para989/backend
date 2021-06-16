const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReviewSchema = new Schema({
    type: {
        $type: mongoose.Schema.Types.String,
        enum: ['global', 'place', 'product', 'customer', 'review'],
        required: true,
    },
    from: {
        $type: mongoose.Schema.Types.String,
        enum: ['app', 'site', 'office'],
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
        $type: mongoose.Schema.Types.Mixed,
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

// ReviewSchema.index({'order': 1});

module.exports = mongoose.model('Review', ReviewSchema);
