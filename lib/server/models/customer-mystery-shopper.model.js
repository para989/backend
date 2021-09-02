const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
    },
    place: {
        type: Schema.Types.ObjectId,
        ref: 'Place',
        required: true,
    },
    status: {
        type: mongoose.Schema.Types.String,
        enum: ['pending', 'working', 'verifying', 'rejected', 'finished'],
        default: 'pending',
    },
    message: mongoose.Schema.Types.String,
}, {
    collection: 'customer-mystery-shoppers',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'customer': 1, 'place': 1}, {unique: true});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('CustomerMysteryShopper', schema);
