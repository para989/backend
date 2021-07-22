const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    domain: {
        $type: mongoose.Schema.Types.String,
        required: true,
    },
    content: {
        $type: {
            type: mongoose.Schema.Types.String,
            value: mongoose.Schema.Types.String,
        },
        default: undefined,
    },
}, {
    collection: 'domains',
    typeKey: '$type',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'domain': 1}, {unique: true});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Domain', schema);
