const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    cause: {
        type: Schema.Types.String,
        enum: ['balance', 'order', 'season'],
        required: true,
    },
    amount: {
        type: Schema.Types.Number,
        required: true,
    },
    from: {
        type: Schema.Types.String,
        enum: ['app', 'site'],
        required: true,
    },
    customer: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    object: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    paymentMethod: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    response: mongoose.Schema.Types.Mixed,
    place: mongoose.Schema.Types.ObjectId,
    status: {
        type: Schema.Types.String,
        enum: ['pending', 'success', 'fail'],
        default: 'pending',
    },
}, {
    collection: 'payments',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'status': 1, 'cause': 1, 'created': 1});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Payment', schema);
