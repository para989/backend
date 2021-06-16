const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FormSchema = new Schema({
    type: {
        $type: Schema.Types.String,
        required: true,
    },
    items: {
        $type: Schema.Types.Mixed,
        required: true,
    },
}, {
    collection: 'forms',
    typeKey: '$type',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

FormSchema.index({'type': 1});

module.exports = mongoose.model('Form', FormSchema);
