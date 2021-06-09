const _ = require('lodash');

exports.placeCard = (data) => {
    let address = data.street;
    if (data.house !== '-') {
        address += `, ${data.house}`;
    }
    return {
        id: data._id.toString(),
        coordinates: data.coordinates,
        phone: data.phone,
        picture: _.get(data, 'gallery.0.picture', 'no-photo.png'),
        primary: data.primary === true,
        delivery: data.delivery === true,
        pickup: data.pickup === true,
        inside: data.inside === true,
        address,
    };
}
