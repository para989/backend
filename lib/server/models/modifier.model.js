const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    name: {
        $type: mongoose.Schema.Types.String,
        required: true,
    },
    order: {
        $type: mongoose.Schema.Types.Number,
        default: function () {
            return Math.ceil(new Date().getTime() / 1000);
        },
    },
    description: mongoose.Schema.Types.String,
    picture: mongoose.Schema.Types.String,
    type: mongoose.Schema.Types.String,
    code: mongoose.Schema.Types.String,
    maximum: mongoose.Schema.Types.Number,
    length: {
        $type: mongoose.Schema.Types.Number,
        default: 1,
    },
    required: {
        $type: mongoose.Schema.Types.Boolean,
        default: false,
    },
    items: [
        {
            _id: mongoose.Schema.Types.ObjectId,
            name: mongoose.Schema.Types.String,
            description: mongoose.Schema.Types.String,
            picture: mongoose.Schema.Types.String,
            primary: mongoose.Schema.Types.Boolean,
            price: mongoose.Schema.Types.Number,
            value: mongoose.Schema.Types.Number,
            type: mongoose.Schema.Types.String,
            proteins: mongoose.Schema.Types.Number,
            fats: mongoose.Schema.Types.Number,
            carbohydrates: mongoose.Schema.Types.Number,
            energy: mongoose.Schema.Types.Number,
            code: mongoose.Schema.Types.String,
        }
    ]
}, {
    collection: 'modifiers',
    typeKey: '$type',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'items._id': 1});
schema.index({'order': 1});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Modifier', schema);
