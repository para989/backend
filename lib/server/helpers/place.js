const _ = require('lodash');

exports.placeCard = (data) => {

    return {
        id: data.id || data._id.toString(),
        city: data.city.toString(),
        brand: data.brand,
        address: data.address,
        coordinates: data.coordinates,
        phone: data.phone,
        gallery: data.gallery,
        picture: _.get(data, 'gallery.0.picture', 'no-photo.png'),
        primary: data.primary === true,
        delivery: data.delivery === true,
        pickup: data.pickup === true,
        inside: data.inside === true,
    };
}
