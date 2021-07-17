const _ = require('lodash');

exports.groupCard = (data) => {
    const stickers = [];
    _.each(data.stickers, sticker => {
        stickers.push({
            name: sticker.name,
            color: _.get(sticker, 'color.hex'),
        });
    });
    return {
        id: data.id || data._id.toString(),
        name: data.name,
        picture: data.picture,
        stickers,
    };
}
