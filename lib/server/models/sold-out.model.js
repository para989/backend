const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    product: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    place: Schema.Types.ObjectId,
}, {
    collection: 'sold-out',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'product': 1, 'place': 1});
schema.index({'place': 1});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('SoldOutSchema', schema);
