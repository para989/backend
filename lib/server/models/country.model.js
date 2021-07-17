const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    name: {
        type: Schema.Types.String,
        required: true
    },
    iso: {
        type: Schema.Types.String,
        required: true
    },
    dateFormat: {
        type: Schema.Types.String,
        required: true
    },
    currency: {
        type: Schema.Types.String,
        required: true
    },
    timeFormat: {
        type: Schema.Types.Number,
        required: true
    },
}, {
    collection: 'countries',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'name': 1});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Country', schema);
