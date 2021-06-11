const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CustomerBalanceSchema = new Schema({
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
    collection: 'customer-balances',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

CustomerBalanceSchema.index({'customer': 1});

module.exports = mongoose.model('CustomerBalance', CustomerBalanceSchema);
