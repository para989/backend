const _ = require('lodash');
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
const cache = !isTest();

module.exports = {
    name: 'showcase',
    version: 1,
    events: {
        'content:updated': {
            async handler(ctx) {
                this.broker.cacher.clean('v1.showcase.**');
            },
        },
    },
    actions: {
        // v1.showcase.data
        data: {
            cache,
            async handler(ctx) {

                const amounts = await ctx.call('v1.balances.amounts');

                const result = {
                    onesignalid: _.get(this.broker.metadata, 'notification.id'),
                    name: _.get(this.broker.metadata, 'name'),
                    organization: _.get(this.broker.metadata, 'organization'),
                    qrcode: _.get(this.broker.metadata, 'qrcode', false),
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
                    amounts,
                };

                // places

                const query = {active: true};
                if (!isTest()) {
                    query.test = null;
                }
                const _places = await ctx.call('v1.places.find', {sort: 'order', query});
                _.each(_places, place => {
                    result.places.push(placeCard(place));
                });

                // units

                const units = await ctx.call('v1.units.get');

                // modifiers

                const _modifiers = await ctx.call('v1.modifiers.find', {sort: 'order'});
                _.each(_modifiers, modifier => {
                    result.modifiers.push(modifierCard(modifier, units));
                });

                // ingredients

                const _ingredients = await ctx.call('v1.ingredients.find', {sort: 'order'});
                _.each(_ingredients, ingredient => {
                    result.ingredients.push(ingredientCard(ingredient));
                });

                // gifts

                const gifts = await ctx.call('v1.gifts.find');
                _.each(gifts, gift => {
                    result.gifts.push(giftCard(gift));
                });

                // groups, hits, additionals

                const groups = {};

                const _products = await ctx.call('v1.products.find', {sort: 'order'});

                _.each(_products, product => {
                    const productid = product._id.toString();
                    if (product.active) {
                        result.products.push(productCard(product, units));
                        _.each(product.groups, groupid => {
                            groupid = groupid.toString();
                            if (!groups[groupid]) {
                                groups[groupid] = [];
                            }
                            groups[groupid].push(productid);
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

                const _groups = await ctx.call('v1.groups.find', {query: {active: true}, sort: 'order'});
                _.each(_groups, group => {
                    const groupid = group._id.toString();
                    group = groupCard(group);
                    if (_.size(groups[groupid])) {
                        group.products = groups[groupid];
                        result.groups.push(group);
                    }
                });

                // promotions

                const _promotions = await ctx.call('v1.promotions.find', {
                    query: {active: true},
                    sort: 'order',
                    fields: '_id name description picture banner'
                });

                _.each(_promotions, promotion => {
                    result.promotions.push(promotionCard(promotion));
                });

                // seasons

                const _seasons = await ctx.call('v1.seasons.find', {query: {active: true, placement: {$ne: 'site'}}, sort: 'order'});

                _.each(_seasons, season => {
                    result.seasons.push(seasonCard(season));
                });

                // agreements

                const _agreements = await ctx.call('v1.agreements.find', {
                    sort: 'order',
                    fields: '_id name'
                });

                _.each(_agreements, agreement => {
                    result.agreements.push(agreementCard(agreement));
                });

                // payment methods

                const _paymentMethods = await ctx.call('v1.payment-methods.find', {sort: 'order', query: {placement: {$ne: 'site'}, test: isTest()}});
                _.each(_paymentMethods, paymentMethod => {
                    const type = paymentMethod.type;
                    if (type === 'balance') {
                        result.balanceEnabled = true;
                    }
                    if (type === 'bonuses') {
                        result.bonusesEnabled = true;
                    }
                    result.paymentMethods.push(paymentMethodCard(paymentMethod));
                });

                return result;

            },
        },
        // v1.showcase.places
        places: {
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
    },
};
