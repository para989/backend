const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SoldOutSchema = new Schema({
    product: {
        $type: Schema.Types.ObjectId,
        required: true,
    },
    place: Schema.Types.ObjectId,
}, {
    collection: 'sold-out',
    typeKey: '$type',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

SoldOutSchema.index({'product': 1, 'place': 1});
SoldOutSchema.index({'place': 1});

module.exports = mongoose.model('SoldOutSchema', SoldOutSchema);
