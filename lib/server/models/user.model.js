const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    name: {
        type: Schema.Types.String,
        required: true,
    },
    email: {
        type: Schema.Types.String,
        required: true,
    },
    phone: Schema.Types.String,
    role: {
        type: Schema.Types.String,
        enum: ['admin', 'manager', 'operator'],
        default: 'admin',
        required: true,
    },
    password: {
        type: Schema.Types.String,
        required: true,
    },
    token: {
        type: Schema.Types.String,
        required: true,
    },
    permits: mongoose.Schema.Types.Mixed,
    places: {
        type: [
            mongoose.Schema.Types.ObjectId,
        ],
        default: undefined,
    },
    avatar: Schema.Types.String,
    passwords: {
        type: [
            Schema.Types.String,
        ],
        default: undefined,
    },
    date: {
        type: mongoose.Schema.Types.Date,
        default: Date.now,
    },
    profile: Schema.Types.Mixed,
    questionnaire: Schema.Types.Mixed,
}, {
    collection: 'users',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'email': 1}, {unique: true});
schema.index({'places': 1});
schema.index({'token': 1});
schema.index({'name': 'text', 'phone': 'text', 'email': 'text'}, {name: 'search'});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('User', schema);
