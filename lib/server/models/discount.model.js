const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    type: {
        $type: mongoose.Schema.Types.String,
        enum: ['base', 'pickup', 'first', 'next', 'birthday'],
        required: true
    },
    name: mongoose.Schema.Types.String,
    description: mongoose.Schema.Types.String,
    period: {
        type: {
            $type: mongoose.Schema.Types.String,
            enum: ['always', 'till', 'range', 'multiple']
        },
        dates: [
            mongoose.Schema.Types.String
        ],
        start: mongoose.Schema.Types.String,
        end: mongoose.Schema.Types.String
    },
    triggering: mongoose.Schema.Types.Number,
    privilege: {
        $type: {
            base: {
                $type: mongoose.Schema.Types.String,
                enum: ['points', 'check', 'pieces'],
            },
            type: {
                $type: mongoose.Schema.Types.String,
                enum: ['amount', 'percent']
            },
            amount: mongoose.Schema.Types.Number,
            productid: mongoose.Schema.Types.ObjectId,
            products: [
                mongoose.Schema.Types.ObjectId
            ]
        },
        required: true
    },
    condition: {
        $type: {
            base: {
                $type: mongoose.Schema.Types.String,
                enum: ['check', 'pieces']
            },
            minimum: mongoose.Schema.Types.Number,
            products: [
                mongoose.Schema.Types.ObjectId
            ]
        },
        required: true
    },
    combines: {
        $type: mongoose.Schema.Types.Boolean,
        required: true
    },
    audience: {
        man: {
            $type: mongoose.Schema.Types.Boolean,
            default: true,
        },
        woman: {
            $type: mongoose.Schema.Types.Boolean,
            default: true,
        }
    },
    age: {
        minimum: mongoose.Schema.Types.Number,
        maximum: mongoose.Schema.Types.Number
    },
    next: {
        number: mongoose.Schema.Types.Number,
        periodicity: mongoose.Schema.Types.Boolean
    },
    birthday: {
        before: mongoose.Schema.Types.Number,
        after: mongoose.Schema.Types.Number
    },
    order: {
        $type: mongoose.Schema.Types.Number,
        default: function () {
            return Math.ceil(new Date().getTime() / 1000);
        },
    },
}, {
    collection: 'discounts',
    typeKey: '$type',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'order': 1});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Discount', schema);
