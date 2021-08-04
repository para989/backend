const _ = require('lodash');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    date: {
        $type: Schema.Types.Date,
        required: true,
    },
    type: {
        $type: Schema.Types.String,
        enum: ['place', 'product', 'season'],
        required: true,
    },
    object: {
        $type: Schema.Types.ObjectId,
        ref: function () {
            return _.startCase(this.type);
        },
        required: true,
    },
    total: {
        $type: Schema.Types.Number,
        default: 0,
    },
    revenue: {
        $type: Schema.Types.Number,
        default: 0,
    },
}, {
    collection: 'purchases',
    typeKey: '$type',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'date': 1, 'type': 1});
schema.index({'date': 1, 'object': 1});
schema.index({'object': 1});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('PurchaseSchema', schema);
