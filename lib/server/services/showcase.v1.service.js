const _ = require('lodash');
const {MoleculerServerError} = require('moleculer').Errors;
const {paymentMethodCard} = require('../helpers/payment-method');
const {seasonCard} = require('../helpers/season');
const {ingredientCard} = require('../helpers/ingredient');
const {modifierCard} = require('../helpers/modifier');
const {giftCard} = require('../helpers/gift');
const {groupCard} = require('../helpers/group');
const {promotionCard} = require('../helpers/promotion');
const {agreementCard} = require('../helpers/agreement');
const {placeCard} = require('../helpers/place');
const {productCard} = require('../helpers/product');
const {isTest} = require('../helpers/test');
const {cityCard} = require('../helpers/city');
const {brandCard} = require('../helpers/brand');
const cache = !isTest();

module.exports = {
    name: 'showcase',
    version: 1,
    settings: {
        rest: '/v1',
    },
    events: {
        'content:updated': {
            async handler(ctx) {
                await this.broker.cacher.clean('v1.showcase.**');
            },
        },
    },
    actions: {
        // v1.showcase.data
        data: {
            rest: 'GET /customer/showcase/:id?',
            cache,
            params: {
                id: {
                    type: 'string',
                    optional: true,
                },
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const result = {
                    onesignalid: _.get(this.broker.metadata, 'notification.id'),
                    initial: _.get(this.broker.metadata, 'initial', 'primary'),
                    name: _.get(this.broker.metadata, 'name'),
                    organization: _.get(this.broker.metadata, 'organization'),
                    authorization: _.get(this.broker.metadata, 'authorization'),
                    qrcode: _.get(this.broker.metadata, 'qrcode.enabled', false),
                    mysteryShopper: _.get(this.broker.metadata, 'mysteryShopper.enabled', false),
                    amounts: _.get(this.broker.metadata, 'amounts'),
                    desiredTimes: _.get(this.broker.metadata, 'desiredTimes'),
                    site: global.SITE,
                    currency: global.CURRENCY,
                    cities: [],
                    brands: [],
                    places: [],
                    groups: [],
                    products: [],
                    modifiers: [],
                    ingredients: [],
                    gifts: [],
                    hits: [],
                    additionals: [],
                    promotions: [],
                    agreements: [],
                    seasons: [],
                    paymentMethods: [],
                    bonusesEnabled: false,
                    balanceEnabled: false,
                    update: false,
                };

                const android = _.get(this.broker.metadata, 'apps.android');
                if (android) {
                    _.set(result, 'apps.android', android);
                }
                const ios = _.get(this.broker.metadata, 'apps.ios');
                if (ios) {
                    _.set(result, 'apps.ios', ios);
                }

                const cityids = [];
                const brandids = [];

                // places

                const params = {sort: 'order', query: {active: true}};
                if (!isTest()) {
                    params.query.test = null;
                }
                const places = await ctx.call('v1.places.find', params);
                _.each(places, place => {
                    cityids.push(place.city.toString());
                    if (place.brand) {
                        brandids.push(place.brand.toString());
                    }
                    result.places.push(placeCard(place));
                });

                if (_.size(places) === 0) {
                    throw new MoleculerServerError(ctx.meta.__('place-not-found'), 404);
                }

                const query = {active: true};

                let place;

                if (id) {

                    _.each(places, item => {
                        if (item._id.toString() === id || (id === 'primary' && item.primary)) {
                            place = item;
                            return false;
                        }
                    });

                    if (!place) {
                        _.each(places, item => {
                            if (item.primary) {
                                place = item;
                                return false;
                            }
                        });
                    }

                    result.soldOut = await ctx.call('v1.sold-out.items', {id: place._id});

                    query.$or = [{places: place._id}, {places: {$exists: false}}];

                } else {

                    _.each(places, item => {
                        if (item.primary) {
                            place = item;
                            return false;
                        }
                    });

                }

                if (!place) {
                    place = places[0];
                }

                result.id = place._id;

                // cities

                const cities = await ctx.call('v1.cities.find', {
                    query: {_id: {$in: _.uniq(cityids)}},
                    fields: '_id name',
                    sort: 'priority name'
                });
                _.each(cities, city => {
                    result.cities.push(cityCard(city));
                });

                // brands

                const brands = await ctx.call('v1.brands.find', {
                    query: {_id: {$in: _.uniq(brandids)}},
                    fields: '_id name description picture',
                    sort: 'order'
                });
                _.each(brands, brand => {
                    result.brands.push(brandCard(brand));
                });

                // units

                const units = await ctx.call('v1.units.get');

                // modifiers

                const modifiers = await ctx.call('v1.modifiers.find', {sort: 'order'});
                _.each(modifiers, modifier => {
                    result.modifiers.push(modifierCard(modifier, units));
                });

                // ingredients

                const ingredients = await ctx.call('v1.ingredients.find', {sort: 'order'});
                _.each(ingredients, ingredient => {
                    result.ingredients.push(ingredientCard(ingredient));
                });

                // groups, hits, additionals

                const map = {};

                const products = await ctx.call('v1.products.find', {sort: 'order', query});
                _.each(products, product => {
                    const productid = product._id.toString();
                    if (product.active) {
                        result.products.push(productCard(product, units));
                        _.each(product.groups, groupid => {
                            groupid = groupid.toString();
                            if (!map[groupid]) {
                                map[groupid] = [];
                            }
                            map[groupid].push(productid);
                        });
                        if (product.hit) {
                            result.hits.push(productid);
                        }
                    }
                    if (product.additional) {
                        result.additionals.push(productCard(product, units));
                    }
                    /*if (_.includes(gifts, productid)) {
                        result.gifts.push(productCard(product, units));
                    }*/
                });

                const groups = await ctx.call('v1.groups.find', {sort: 'order', query: {active: true}});
                _.each(groups, group => {
                    const groupid = group._id.toString();
                    group = groupCard(group);
                    if (_.size(map[groupid])) {
                        group.products = map[groupid];
                        result.groups.push(group);
                    }
                });

                // gifts, promotions, seasons

                query.placement = {$ne: 'site'};

                const gifts = await ctx.call('v1.gifts.find', {sort: 'order', query});
                _.each(gifts, gift => {
                    result.gifts.push(giftCard(gift));
                });

                const promotions = await ctx.call('v1.promotions.find', {sort: 'order', query});
                _.each(promotions, promotion => {
                    result.promotions.push(promotionCard(promotion));
                });

                const seasons = await ctx.call('v1.seasons.find', {query, sort: 'order'});
                _.each(seasons, season => {
                    result.seasons.push(seasonCard(season));
                });

                // payment methods

                query.test = isTest();

                const paymentMethods = await ctx.call('v1.payment-methods.find', {sort: 'order', query});
                _.each(paymentMethods, paymentMethod => {
                    const type = paymentMethod.type;
                    if (type === 'balance') {
                        result.balanceEnabled = true;
                    }
                    if (type === 'bonuses') {
                        result.bonusesEnabled = true;
                    }
                    result.paymentMethods.push(paymentMethodCard(paymentMethod));
                });

                // agreements

                const agreements = await ctx.call('v1.agreements.find', {
                    sort: 'order',
                    fields: '_id name'
                });

                _.each(agreements, agreement => {
                    result.agreements.push(agreementCard(agreement));
                });

                return result;

            },
        },
        // v1.showcase.places
        places: {
            rest: 'GET /customer/places',
            cache,
            async handler(ctx) {
                const places = [];
                const query = {active: true};
                if (!isTest()) {
                    query.test = null;
                }
                const _places = await ctx.call('v1.places.find', {sort: 'order', query});
                _.each(_places, place => {
                    places.push(placeCard(place));
                });
                return places;
            },
        },
        // v1.showcase.link
        link: {
            rest: 'POST /customer/link',
            cache,
            params: {
                url: 'url',
            },
            async handler(ctx) {
                const url = new URL(ctx.params.url);
                const hash = url.hash;
                const hostname = url.hostname;
                if (hostname === global.DOMAIN) {
                    if (_.includes(hash, '#product-')) {
                        const url = _.replace(hash, '#product-', '');
                        const product = await ctx.call('v1.products.findOne', {query: {url}, fields: 'id'});
                        if (product) {
                            return {type: 'product', value: product.id};
                        }
                    } else if (_.includes(hash, '#promotion-')) {
                        const id = _.replace(hash, '#promotion-', '');
                        const promotion = await ctx.call('v1.promotions.findOne', {query: {_id: id}, fields: 'id'});
                        if (promotion) {
                            return {type: 'promotion', value: promotion.id};
                        }
                    }
                }
                throw new MoleculerServerError(ctx.meta.__('nothing-found'), 404);
            },
        },
    },
};
