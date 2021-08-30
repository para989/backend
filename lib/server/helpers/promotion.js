const _ = require('lodash');
const {toBrowser} = require('./delta');

exports.promotionCard = (data) => {
    const id = data.id || data._id.toString();
    const content = _.get(data, 'content', {type: 'text', value: id});
    const href = content.type === 'link' ? content.value : `https://${global.DOMAIN}/#promotion-${id}`;
    return {
        id,
        name: data.name,
        description: data.description,
        text: data.text ? toBrowser(data.text) : '',
        picture: data.picture,
        banner: data.banner,
        content,
        href,
    };
}
