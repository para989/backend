const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    email: {
        type: Schema.Types.String,
        required: true
    },
    verify: {
        type: Schema.Types.Boolean,
        default: false
    },
}, {
    collection: 'emails',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'user': 1, 'email': 1});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Email', schema);
