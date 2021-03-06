const _ = require('lodash');

exports.modifierCard = (data, units) => {
    const items = [];
    _.each(data.items, item => {
        items.push({
            id: item.id || item._id.toString(),
            type: units[item.type],
            name: item.name || '',
            picture: item.picture,
            primary: item.primary,
            price: item.price,
            value: item.value,
            proteins: item.proteins || 0,
            fats: item.fats || 0,
            carbohydrates: item.carbohydrates || 0,
            energy: item.energy || 0,
        });
    });
    return {
        id: data.id || data._id.toString(),
        type: data.type,
        name: data.name,
        picture: data.picture,
        maximum: data.maximum || 1,
        required: data.required,
        items,
    };
}
