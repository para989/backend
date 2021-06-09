const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AgreementSchema = new Schema({
    order: {
        $type: mongoose.Schema.Types.Number,
        default: function () {
            return Math.ceil(new Date().getTime() / 1000);
        },
    },
    name: {
        $type: mongoose.Schema.Types.String,
        required: true,
    },
    text: {
        $type: mongoose.Schema.Types.String,
        required: true,
    },
}, {
    collection: 'agreements',
    typeKey: '$type',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

AgreementSchema.index({'order': 1});

module.exports = mongoose.model('Agreement', AgreementSchema);
