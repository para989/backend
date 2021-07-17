const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    customer: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    amount: {
        type: Schema.Types.Number,
        required: true,
    },
    date: {
        type: mongoose.Schema.Types.Date,
        default: Date.now,
    },
}, {
    collection: 'customer-bonuses',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'customer': 1});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('CustomerBonuse', schema);
