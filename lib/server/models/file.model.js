const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FileSchema = new Schema({
    path: {
        type: Schema.Types.String,
        required: true,
    },
    body: {
        type: Schema.Types.Buffer,
        required: true,
    },
    contentType: {
        type: Schema.Types.String,
        required: true,
    },
}, {
    collection: 'files',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

FileSchema.index({'path': 1});

module.exports = mongoose.model('File', FileSchema);
