const _ = require('lodash');
const units = [
    {
        "name": "pcs",
        "en": "pcs",
        "ru": "шт"
    },
    {
        "name": "kilogram",
        "en": "kg",
        "ru": "кг"
    },
    {
        "name": "gram",
        "en": "gm",
        "ru": "г"
    },
    {
        "name": "miligram",
        "en": "mg",
        "ru": "мг"
    },
    {
        "name": "liter",
        "en": "Ltr",
        "ru": "л"
    },
    {
        "name": "mililiter",
        "en": "ml",
        "ru": "мл"
    },
];

module.exports = {
    name: 'units',
    version: 1,
    actions: {
        get: {
            async handler(ctx) {
                const result = {};
                _.each(units, (item) => {
                    result[item.name] = item[_.get(ctx.params, 'language', 'ru')];
                });
                return result;
            },
        },
    }
};
