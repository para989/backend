const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    type: {
        $type: mongoose.Schema.Types.String,
        enum: ['customer', 'user'],
        required: true,
    },
    author: {
        $type: mongoose.Schema.Types.ObjectId,
        ref: function () {
            return this.type === 'user' ? 'User' : 'Customer';
        },
        required: true,
    },
    checklist: {
        $type: mongoose.Schema.Types.ObjectId,
        ref: 'Checklist',
        required: true,
    },
    place: {
        $type: mongoose.Schema.Types.ObjectId,
        ref: 'Place',
        required: true,
    },
    values: {
        $type: Schema.Types.Mixed,
        required: true,
    },
    violations: {
        $type: Schema.Types.Number,
        default: 0,
    },
    description: mongoose.Schema.Types.String,
}, {
    collection: 'inspections',
    typeKey: '$type',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'checklist': 1});
schema.index({'place': 1});
schema.index({'created': 1});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Inspection', schema);
