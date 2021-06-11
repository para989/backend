const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CustomerSeasonSchema = new Schema({
    customer: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    place: Schema.Types.ObjectId,
    season: {
        type: Schema.Types.ObjectId,
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

CustomerSeasonSchema.index({'customer': 1, 'place': 1});
CustomerSeasonSchema.index({'date': 1});

module.exports = mongoose.model('CustomerSeason', CustomerSeasonSchema);
