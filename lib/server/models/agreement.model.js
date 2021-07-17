const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    order: {
        type: mongoose.Schema.Types.Number,
        default: function () {
            return Math.ceil(new Date().getTime() / 1000);
        },
    },
    name: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    text: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
}, {
    collection: 'agreements',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'order': 1});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Agreement', schema);
