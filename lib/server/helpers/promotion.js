const _ = require('lodash');

exports.promotionCard = (data) => {
    const id = data._id.toString();
    return {
        id,
        name: data.name,
        description: data.description,
        picture: data.picture,
        banner: data.banner,
        content: _.get(data, 'content', {type: 'promotion', value: id}),
    };
}
