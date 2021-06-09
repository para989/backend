const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DomainSchema = new Schema({
    domain: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
}, {
    collection: 'domains',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

DomainSchema.index({'domain': 1}, {unique: true});

module.exports = mongoose.model('Domain', DomainSchema);
