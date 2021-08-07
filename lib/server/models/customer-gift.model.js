const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
    },
    gift: {
        type: Schema.Types.ObjectId,
        ref: 'Gift',
        required: true,
    },
    count: {
        type: Schema.Types.Number,
        default: 0,
    },
    date: {
        type: mongoose.Schema.Types.Date,
        default: Date.now,
    },
}, {
    collection: 'customer-gifts',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'customer': 1, 'gift': 1});
schema.index({'gift': 1});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('CustomerGift', schema);
