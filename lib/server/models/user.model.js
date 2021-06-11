const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
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
    permits: {
        type: {
            orders: {
                type: Schema.Types.String,
                enum: ['not', 'read', 'write'],
                default: 'read',
            },
            places: {
                type: Schema.Types.String,
                enum: ['not', 'read', 'write'],
                default: 'read',
            },
            showcase: {
                type: Schema.Types.String,
                enum: ['not', 'read', 'write'],
                default: 'read',
            },
            marketing: {
                type: Schema.Types.String,
                enum: ['not', 'read', 'write'],
                default: 'read',
            },
            users: {
                type: Schema.Types.String,
                enum: ['not', 'read', 'write'],
                default: 'read',
            },
            reports: {
                type: Schema.Types.String,
                enum: ['not', 'read'],
                default: 'read',
            },
            settings: {
                type: Schema.Types.String,
                enum: ['not', 'read', 'write'],
                default: 'read',
            },
        },
        default: undefined,
    },
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
    test: {
        type: Schema.Types.Boolean,
        default: false,
    },
}, {
    collection: 'users',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

UserSchema.index({'email': 1}, {unique: true});
UserSchema.index({'places': 1});
UserSchema.index({'token': 1});
UserSchema.index({'name': 'text', 'phone': 'text', 'email': 'text'}, {name: 'search'});

module.exports = mongoose.model('User', UserSchema);
