const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RegionSchema = new Schema({
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

RegionSchema.index({'country': 1});
RegionSchema.index({'name': 1});

module.exports = mongoose.model('Region', RegionSchema);
