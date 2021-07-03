const _ = require('lodash');
const {toBrowser} = require('./delta');

exports.promotionCard = (data) => {
    const id = data._id.toString();
    return {
        id,
        name: data.name,
        description: data.description,
        text: toBrowser(data.text),
        picture: data.picture,
        banner: data.banner,
        content: _.get(data, 'content', {type: 'promotion', value: id}),
    };
}
