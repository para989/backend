const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CountrySchema = new Schema({
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

CountrySchema.index({'name': 1});

module.exports = mongoose.model('Country', CountrySchema);
