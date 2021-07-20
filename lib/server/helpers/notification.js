const _ = require('lodash');
const {toBrowser} = require('./delta');

exports.notificationCard = (data) => {
    const id = data.id || data._id.toString();
    return {
        id,
        name: data.name,
        description: data.description,
        picture: data.picture,
        content: _.get(data, 'content', {type: 'text', value: id}),
    };
}
