const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);
const Schema = mongoose.Schema;

const schema = new Schema({
    index: mongoose.Schema.Types.Number,
    user: {
        type: {
            _id: mongoose.Schema.Types.ObjectId,
            name: mongoose.Schema.Types.String,
        },
        default: undefined,
    },
    customer: mongoose.Schema.Types.ObjectId,
    from: {
        type: mongoose.Schema.Types.String,
        enum: ['app', 'site'],
        required: true,
    },
    obtaining: {
        type: mongoose.Schema.Types.String,
        enum: ['delivery', 'pickup', 'inside'],
        required: true,
    },
    paymentMethod: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    status: {
        type: mongoose.Schema.Types.String,
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
        type: mongoose.Schema.Types.Number,
        default: 0,
    },
    items: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    number: {
        type: mongoose.Schema.Types.Number,
        required: true,
    },
    costDelivery: mongoose.Schema.Types.Number,
    costPacking: mongoose.Schema.Types.Number,
    discount: mongoose.Schema.Types.Number,
    amount: {
        type: mongoose.Schema.Types.Number,
        required: true,
    },
    date: {
        type: mongoose.Schema.Types.Date,
        default: Date.now,
    },
    place: mongoose.Schema.Types.ObjectId,
    name: mongoose.Schema.Types.String,
    email: mongoose.Schema.Types.String,
    phone: mongoose.Schema.Types.String,
    wishes: mongoose.Schema.Types.String,
    address: mongoose.Schema.Types.String,
    desiredTime: mongoose.Schema.Types.Date,
    test: Schema.Types.Boolean,
}, {
    collection: 'orders',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({index: 1});
schema.index({customer: 1});
schema.index({status: 1});
schema.index({date: 1});
schema.index({date: -1});
schema.index({number: 1});
schema.index({place: 1});
schema.index({test: 1});
schema.index({'customer.email': 'text', 'customer.name': 'text', 'customer.phone': 'text'}, {name: 'search'});
schema.plugin(AutoIncrement, {inc_field: 'index'});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Order', schema);
