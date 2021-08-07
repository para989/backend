const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
    },
    place: {
        type: Schema.Types.ObjectId,
        ref: 'Place',
        required: true,
    },
    season: {
        type: Schema.Types.ObjectId,
        ref: 'Season',
        required: true,
    },
    date: {
        type: Schema.Types.Date,
        required: true,
    },
}, {
    collection: 'customer-seasons',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'customer': 1, 'place': 1});
schema.index({'season': 1});
schema.index({'date': 1});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('CustomerSeason', schema);
