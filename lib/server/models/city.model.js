const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CitySchema = new Schema({
    country: {
        $type: Schema.Types.ObjectId,
        ref: 'Country',
        required: true,
    },
    region: {
        $type: Schema.Types.ObjectId,
        ref: 'Region',
        required: true,
    },
    name: {
        $type: Schema.Types.String,
        required: true,
    },
    url: {
        $type: Schema.Types.String,
        required: true,
    },
    coordinates: {
        $type: {
            longitude: mongoose.Schema.Types.Number,
            latitude: mongoose.Schema.Types.Number,
        },
        required: true,
    },
    rawOffset: {
        $type: Schema.Types.Number,
        required: true,
    },
    timeZoneId: {
        $type: Schema.Types.String,
        required: true,
    },
    timeZoneName: {
        $type: Schema.Types.String,
        required: true,
    },
    districts: [{
        _id: Schema.Types.ObjectId,
        name: Schema.Types.String,
    }],
    metro: [{
        _id: Schema.Types.ObjectId,
        name: Schema.Types.String,
    }]
}, {
    collection: 'cities',
    typeKey: '$type',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

CitySchema.index({'country': 1});
CitySchema.index({'region': 1});
CitySchema.index({'name': 1});
CitySchema.index({'url': 1});

CitySchema.index({'name': 'text'}, {name: 'search'});

module.exports = mongoose.model('City', CitySchema);
