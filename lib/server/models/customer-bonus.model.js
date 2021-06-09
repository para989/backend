const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CustomerBonuseSchema = new Schema({
    customer: {
        $type: Schema.Types.ObjectId,
        required: true,
    },
    amount: {
        $type: Schema.Types.Number,
        required: true,
    },
    date: {
        $type: mongoose.Schema.Types.Date,
        default: Date.now,
    },
}, {
    collection: 'customer-bonuses',
    typeKey: '$type',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

CustomerBonuseSchema.index({'customer': 1});

module.exports = mongoose.model('CustomerBonuse', CustomerBonuseSchema);
