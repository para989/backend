const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    country: {
        type: Schema.Types.ObjectId,
        ref: 'Country',
        required: true,
    },
    region: {
        type: Schema.Types.ObjectId,
        ref: 'Region',
        required: true,
    },
    name: {
        type: Schema.Types.String,
        required: true,
    },
    url: {
        type: Schema.Types.String,
        required: true,
    },
    coordinates: {
        type: {
            longitude: mongoose.Schema.Types.Number,
            latitude: mongoose.Schema.Types.Number,
        },
        required: true,
    },
    rawOffset: {
        type: Schema.Types.Number,
        required: true,
    },
    timeZoneId: {
        type: Schema.Types.String,
        required: true,
    },
    timeZoneName: {
        type: Schema.Types.String,
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
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'country': 1});
schema.index({'region': 1});
schema.index({'name': 1});
schema.index({'url': 1});
schema.index({'name': 'text'}, {name: 'search'});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('City', schema);
