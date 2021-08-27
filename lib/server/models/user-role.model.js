const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    name: {
        type: Schema.Types.String,
        required: true,
    },
    role: {
        type: Schema.Types.String,
        required: true,
    },
    count: {
        type: Schema.Types.Number,
        default: 0,
    },
    internal: {
        type: Schema.Types.Boolean,
        default: false,
    },
    description: Schema.Types.String,
}, {
    collection: 'user-roles',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'role': 1}, {unique: true});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('UserRole', schema);
