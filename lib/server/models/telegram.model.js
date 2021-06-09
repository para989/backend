const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TelegramSchema = new Schema({
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

TelegramSchema.index({'user': 1});
TelegramSchema.index({'id': 1});

module.exports = mongoose.model('Telegram', TelegramSchema);
