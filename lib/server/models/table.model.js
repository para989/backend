const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    place: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Place',
    },
    name: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    gallery: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    active: {
        type: mongoose.Schema.Types.Boolean,
        default: true,
    },
    description: mongoose.Schema.Types.String,
    order: {
        type: mongoose.Schema.Types.Number,
        default: function () {
            return Math.ceil(new Date().getTime() / 1000);
        },
    },
}, {
    collection: 'tables',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false,
});

schema.index({'place': 1});
schema.index({'order': 1});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Table', schema);
