const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    country: {
        type: Schema.Types.ObjectId,
        required: true
    },
    name: {
        type: Schema.Types.String,
        required: true
    },
    short: Schema.Types.String
}, {
    collection: 'regions',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'country': 1});
schema.index({'name': 1});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Region', schema);
