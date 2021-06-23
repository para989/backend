const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CustomerSchema = new Schema({
    token: {
        type: Schema.Types.String,
        required: true,
    },
    name: Schema.Types.String,
    phone: Schema.Types.String,
    email: Schema.Types.String,
    avatar: Schema.Types.String,
    birthday: Schema.Types.String,
    balance: {
        type: Schema.Types.Number,
        default: 0,
    },
    bonuses: {
        type: Schema.Types.Number,
        default: 0,
    },
    ordered: {
        type: [
            mongoose.Schema.Types.ObjectId,
        ],
        default: undefined,
    },
    test: Schema.Types.Boolean,
    code: Schema.Types.String,
}, {
    collection: 'customers',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

CustomerSchema.index({'email': 1}, {unique: true, sparse: true});
CustomerSchema.index({'phone': 1}, {unique: true, sparse: true});
CustomerSchema.index({'token': 1});
CustomerSchema.index({'ordered': 1});
CustomerSchema.index({'name': 'text', 'phone': 'text', 'email': 'text'}, {name: 'search'});

module.exports = mongoose.model('Customer', CustomerSchema);
