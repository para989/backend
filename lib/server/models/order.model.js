const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);
const Schema = mongoose.Schema;

const OrderSchema = new Schema({
    index: mongoose.Schema.Types.Number,
    user: {
        $type: {
            _id: mongoose.Schema.Types.ObjectId,
            name: mongoose.Schema.Types.String,
        },
        default: undefined,
    },
    customer: mongoose.Schema.Types.ObjectId,
    from: {
        $type: mongoose.Schema.Types.String,
        enum: ['app', 'site'],
        required: true,
    },
    obtaining: {
        $type: mongoose.Schema.Types.String,
        enum: ['delivery', 'pickup', 'inside'],
        required: true,
    },
    paymentMethod: {
        $type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    status: {
        $type: mongoose.Schema.Types.String,
        enum: [
            'new', // новый - push оператору
            'processed', // обрабатывается (указать оператора: user)
            'returned', // вернуть оператору - push оператору
            'preparing', // подготовка к сборке - push сборщику
            'going', // собирается (указать id сборщика)
            'delivered', // доставляется (указать курьера: user) - push курьеру
            'finished', // заказ завершен
            'canceled', // заказ отменен
            'archived', // заказ в архиве
            'unpaid', // не оплаченный
        ],
        default: 'new',
    },
    progress: {
        $type: mongoose.Schema.Types.Number,
        default: 0,
    },
    items: {
        $type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    number: {
        $type: mongoose.Schema.Types.Number,
        required: true,
    },
    costDelivery: mongoose.Schema.Types.Number,
    costPacking: mongoose.Schema.Types.Number,
    discount: mongoose.Schema.Types.Number,
    amount: {
        $type: mongoose.Schema.Types.Number,
        required: true,
    },
    date: {
        $type: mongoose.Schema.Types.Date,
        default: Date.now,
    },
    place: mongoose.Schema.Types.ObjectId,
    name: mongoose.Schema.Types.String,
    email: mongoose.Schema.Types.String,
    phone: mongoose.Schema.Types.String,
    wishes: mongoose.Schema.Types.String,
    desiredTime: mongoose.Schema.Types.Date,
}, {
    collection: 'orders',
    typeKey: '$type',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

OrderSchema.index({index: 1});
OrderSchema.index({customer: 1});
OrderSchema.index({status: 1});
OrderSchema.index({date: 1});
OrderSchema.index({date: -1});
OrderSchema.index({number: 1});
OrderSchema.index({place: 1});
OrderSchema.index({'customer.email': 'text', 'customer.name': 'text', 'customer.phone': 'text'}, {name: 'search'});

OrderSchema.plugin(AutoIncrement, {inc_field: 'index'});

module.exports = mongoose.model('Order', OrderSchema);