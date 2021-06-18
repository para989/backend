const _ = require('lodash');
const urllib = require('urllib');
const {MoleculerServerError} = require('moleculer').Errors;

module.exports = {
    name: 'geo',
    version: 1,
    settings: {
        rest: '/v1',
    },
    actions: {
        // v1.geo.find
        // https://yandex.ru/dev/maps/geocoder/doc/desc/concepts/input_params.html
        find: {
            rest: 'POST /user/geo',
            cache: false,
            params: {
                search: {
                    type: 'string',
                },
            },
            async handler(ctx) {

                let lang;

                switch (global.LANG) {
                    case 'ru':
                        lang = 'ru_RU';
                        break;
                    case 'uk':
                        lang = 'uk_UA';
                        break;
                    case 'be':
                        lang = 'be_BY';
                        break;
                    case 'tr':
                        lang = 'tr_TR';
                        break;
                    case 'en':
                    default:
                        lang = 'en_US';
                        break;
                }

                const data = {
                    geocode: ctx.params.search,
                    format: 'json',
                    kind: 'house',
                    lang,
                    apikey: _.get(this.broker.metadata, 'maps.key'),
                };

                const response = await urllib.request('https://geocode-maps.yandex.ru/1.x', {dataType: 'json', data});

                if (response.status !== 200) {
                    throw new MoleculerServerError(response.data.message);
                }

                const result = [];

                const items = _.get(response.data, 'response.GeoObjectCollection.featureMember');

                _.each(items, item => {

                    const kind = _.get(item, 'GeoObject.metaDataProperty.GeocoderMetaData.kind');
                    const address = _.get(item, 'GeoObject.metaDataProperty.GeocoderMetaData.Address');

                    if (kind === 'house' && _.size(address)) {

                        const point = _.split(_.get(item, 'GeoObject.Point.pos'), ' ');

                        let street = '', house = '', locality = '';

                        _.each(_.get(address, 'Components'), component => {
                            switch (component.kind) {
                                case 'street':
                                    street = component.name;
                                    break;
                                case 'house':
                                    house = component.name;
                                    break;
                                case 'locality':
                                    locality = component.name;
                                    break;
                            }
                        });

                        if (!street) {
                            street = locality;
                        }

                        result.push({
                            name: `${street}, ${house}`,
                            street,
                            house,
                            coordinates: {longitude: _.toNumber(point[0]), latitude: _.toNumber(point[1])},
                        });

                    }

                });

                return result;

            }
        },
        // v1.geo.map
        // https://yandex.ru/dev/maps/staticapi/doc/1.x/dg/concepts/input_params.html
        map: {
            rest: '/images/map.png',
            cache: true,
            params: {
                latitude: {
                    type: 'number',
                    convert: true,
                },
                longitude: {
                    type: 'number',
                    convert: true,
                },
                size: {
                    type: 'number',
                    convert: true,
                },
            },
            async handler(ctx) {

                let lang;

                switch (global.LANG) {
                    case 'ru':
                        lang = 'ru_RU';
                        break;
                    case 'uk':
                        lang = 'uk_UA';
                        break;
                    case 'be':
                        lang = 'be_BY';
                        break;
                    case 'tr':
                        lang = 'tr_TR';
                        break;
                    case 'en':
                    default:
                        lang = 'en_US';
                        break;
                }

                const data = {
                    size: `${ctx.params.size},${ctx.params.size}`,
                    l: 'map',
                    ll: `${ctx.params.longitude},${ctx.params.latitude}`,
                    z: 8,
                    lang,

                };

                const response = await urllib.request('https://static-maps.yandex.ru/1.x/', {data});

                return response.data;

            }
        },
    }
};
