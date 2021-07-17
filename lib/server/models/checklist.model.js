const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    name: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    description: mongoose.Schema.Types.String,
    minWeight: {
        type: mongoose.Schema.Types.Number,
        default: 0,
    },
    items: {
        type: Schema.Types.Mixed,
        required: true,
    },
    order: {
        type: mongoose.Schema.Types.Number,
        default: function () {
            return Math.ceil(new Date().getTime() / 1000);
        },
    },
}, {
    collection: 'checklists',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'order': 1});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Checklist', schema);
