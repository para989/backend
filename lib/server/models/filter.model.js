const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    order: {
        $type: mongoose.Schema.Types.Number,
        default: function () {
            return Math.ceil(new Date().getTime() / 1000);
        },
    },
    name: mongoose.Schema.Types.String,
    type: mongoose.Schema.Types.String,
    maximum: mongoose.Schema.Types.Number,
    length: mongoose.Schema.Types.Number,
    items: [
        {
            _id: mongoose.Schema.Types.ObjectId,
            name: mongoose.Schema.Types.String,
        }
    ]
}, {
    collection: 'filters',
    typeKey: '$type',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'items._id': 1});
schema.index({'order': 1});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Filter', schema);
