const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ConfigSchema = new Schema({
    key: {
        $type: Schema.Types.String,
        required: true,
    },
    value: {
        $type: Schema.Types.Mixed,
        required: true,
    },
}, {
    collection: 'config',
    typeKey: '$type',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

ConfigSchema.index({'key': 1}, {unique: true});

module.exports = mongoose.model('Config', ConfigSchema);
