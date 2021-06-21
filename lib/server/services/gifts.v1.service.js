const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const GiftModel = require('../models/gift.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;

module.exports = {
    name: 'gifts',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: GiftModel,
    actions: {
        get: {
            cache: false,
        },
        find: {
            cache: false,
        },
        items: {
            async handler(ctx) {

                const search = ctx.params.search;
                const result = [];

                const gifts = await ctx.call('v1.gifts.find', {search, searchFields: 'name', sort: 'order'});
                _.each(gifts, gift => {
                    result.push({
                        giftid: gift._id,
                        name: gift.name,
                        placement: gift.placement,
                        description: gift.description,
                        active: gift.active,
                    });
                });

                return result;

            }
        },
        item: {
            params: {
                giftid: 'objectID',
            },
            async handler(ctx) {

                const giftid = ctx.params.giftid;

                const result = {
                    places: [],
                    products: [],
                    gifts: [],
                };

                const placeIndexes = {};
                const productIndexes = {};
                const giftIndexes = {};

                const places = await ctx.call('v1.places.find', {sort: 'order'});
                _.each(places, (place, i) => {
                    placeIndexes[place._id.toString()] = i;
                    result.places.push({placeid: place._id, name: place.name, selected: false});
                });

                const products = await ctx.call('v1.products.find', {sort: 'order'});
                if (_.size(products) === 0) {
                    throw new MoleculerServerError(ctx.meta.__('add-products'), 404);
                }

                _.each(products, (product, i) => {
                    productIndexes[product._id.toString()] = i;
                    result.products.push({productid: product._id, name: product.name, selected: false});
                    giftIndexes[product._id.toString()] = i;
                    result.gifts.push({productid: product._id, name: product.name, selected: false});
                });

                if (giftid === 'new') {
                    return result;
                }

                const gift = await ctx.call('v1.gifts.findOne', {conditions: {_id: giftid}});
                if (!gift) {
                    throw new MoleculerServerError(ctx.meta.__('gift-not-found'), 404);
                }

                result.giftid = gift._id;
                result.name = gift.name;
                result.description = gift.description;
                result.message = gift.message;
                result.placement = gift.placement;
                result.quantity = gift.quantity;
                result.active = gift.active;

                _.each(gift.places, placeid => {
                    placeid = placeid.toString();
                    if (placeIndexes[placeid] !== undefined) {
                        const index = placeIndexes[placeid];
                        result.places[index].selected = true;
                    }
                });

                _.each(gift.products, productid => {
                    productid = productid.toString();
                    if (productIndexes[productid] !== undefined) {
                        const index = productIndexes[productid];
                        result.products[index].selected = true;
                    }
                });

                _.each(gift.gifts, productid => {
                    productid = productid.toString();
                    if (giftIndexes[productid] !== undefined) {
                        const index = giftIndexes[productid];
                        result.gifts[index].selected = true;
                    }
                });

                return result;

            }
        },
        add: {
            async handler(ctx) {

                const count = await this.adapter.model.countDocuments();
                if (count > 0) {
                    throw new MoleculerServerError(ctx.meta.__('already-added'));
                }

                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const message = _.trim(ctx.params.message);
                const placement = ctx.params.placement;
                const quantity = ctx.params.quantity;
                const active = ctx.params.active === true;
                const places = ctx.params.places;
                const products = ctx.params.products;
                const gifts = ctx.params.gifts;

                const set = {};
                set.name = name;
                set.description = description;
                set.message = message;
                set.placement = placement;
                set.quantity = quantity;
                set.active = active;
                if (_.size(places)) {
                    set.places = places;
                }
                if (_.size(products)) {
                    set.products = products;
                }
                if (_.size(gifts)) {
                    set.gifts = gifts;
                }

                await ctx.call('v1.gifts.create', set);

                await this.broker.emit('content:updated');

            }
        },
        edit: {
            params: {
                giftid: 'objectID',
            },
            async handler(ctx) {

                const giftid = ctx.params.giftid;
                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const message = _.trim(ctx.params.message);
                const placement = ctx.params.placement;
                const quantity = ctx.params.quantity;
                const active = ctx.params.active === true;
                const places = ctx.params.places;
                const products = ctx.params.products;
                const gifts = ctx.params.gifts;

                const set = {};
                const unset = {};
                set.name = name;
                set.description = description;
                set.message = message;
                set.placement = placement;
                set.quantity = quantity;
                set.active = active;
                if (_.size(places)) {
                    set.places = places;
                } else {
                    unset.places = '';
                }
                if (_.size(products)) {
                    set.products = products;
                } else {
                    unset.products = '';
                }
                if (_.size(gifts)) {
                    set.gifts = gifts;
                } else {
                    unset.gifts = '';
                }

                const doc = {$set: set};
                if (_.size(unset)) {
                    doc.$unset = unset;
                }

                await ctx.call('v1.gifts.updateOne', {filter: {_id: giftid}, doc});

                await this.broker.emit('content:updated');

            }
        },
        sort: {
            params: {
                ids: {
                    type: 'array',
                },
            },
            async handler(ctx) {

                const ids = ctx.params.ids;

                const ops = [];
                _.each(ids, (giftid, i) => {
                    ops.push({updateOne: {filter: {_id: giftid}, update: {order: i + 1}}});
                });

                await ctx.call('v1.gifts.bulkWrite', {ops});

                await this.broker.emit('content:updated');

            }
        },
        delete: {
            params: {
                giftid: 'objectID',
            },
            async handler(ctx) {

                const giftid = ctx.params.giftid;

                const gift = await ctx.call('v1.gifts.findOne', {conditions: {_id: giftid}});
                if (!gift) {
                    throw new MoleculerServerError(ctx.meta.__('gift-not-found'), 404);
                }

                await ctx.call('v1.gifts.deleteOne', {conditions: {_id: giftid}});

                await ctx.call('v1.customer-gifts.deleteMany', {conditions: {gift: giftid}});

                await this.broker.emit('content:updated');

            }
        },
    }
};
