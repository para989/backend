const _ = require('lodash');

exports.productCard = (data, units) => {
    const picture = _.get(data, 'gallery.0.picture');
    const prices = [];
    _.each(data.prices, price => {
        prices.push({
            id: price.id,
            picture: _.get(price, 'picture', picture),
            price: price.price,
            value: price.value,
            type: units[price.type],
            description: price.description || '',
            proteins: price.proteins || 0,
            fats: price.fats || 0,
            carbohydrates: price.carbohydrates || 0,
            energy: price.energy || 0,
        });
    });
    const stickers = [];
    _.each(data.stickers, sticker => {
        stickers.push({
            name: sticker.name,
            color: _.get(sticker, 'color.hex'),
        });
    });
    return {
        id: data._id.toString(),
        name: data.name,
        description: data.description || '',
        picture,
        modifiers: data.modifiers || [],
        ingredients: data.ingredients || [],
        prices: _.sortBy(prices, ['price']),
        stickers,
    };
}
