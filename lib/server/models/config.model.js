const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    key: {
        type: Schema.Types.String,
        required: true,
    },
    value: {
        type: Schema.Types.Mixed,
        required: true,
    },
}, {
    collection: 'config',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'key': 1}, {unique: true});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Config', schema);
