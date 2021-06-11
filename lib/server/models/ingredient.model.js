const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const IngredientSchema = new Schema({
    order: {
        type: mongoose.Schema.Types.Number,
        default: function () {
            return Math.ceil(new Date().getTime() / 1000);
        },
    },
    name: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    allergen: {
        type: mongoose.Schema.Types.Boolean,
        default: false,
    },
}, {
    collection: 'ingredients',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

IngredientSchema.index({'order': 1});

module.exports = mongoose.model('Ingredient', IngredientSchema);
