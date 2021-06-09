const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CustomerGiftSchema = new Schema({
    customer: {
        $type: Schema.Types.ObjectId,
        required: true,
    },
    gift: {
        $type: Schema.Types.ObjectId,
        required: true,
    },
    count: {
        $type: Schema.Types.Number,
        default: 0,
    },
    date: {
        $type: mongoose.Schema.Types.Date,
        default: Date.now,
    },
}, {
    collection: 'customer-gifts',
    typeKey: '$type',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

CustomerGiftSchema.index({'customer': 1, 'gift': 1});
CustomerGiftSchema.index({'gift': 1});

module.exports = mongoose.model('CustomerGift', CustomerGiftSchema);
