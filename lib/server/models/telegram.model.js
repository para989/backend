const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    id: {
        type: Schema.Types.Number,
        required: true,
    },
}, {
    collection: 'telegram',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'user': 1});
schema.index({'id': 1});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Telegram', schema);
