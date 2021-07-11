const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const PromoCodeModel = require('../models/promocode.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;

module.exports = {
    name: 'promocodes',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: PromoCodeModel,
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

                const promocodes = await ctx.call('v1.promocodes.find', {
                    search,
                    searchFields: 'code description',
                    sort: 'order'
                });
                _.each(promocodes, promocode => {
                    result.push({
                        promocodeid: promocode._id,
                        code: promocode.code,
                        placement: promocode.placement,
                        description: promocode.description,
                        active: promocode.active,
                    });
                });

                return result;

            }
        },
        item: {
            params: {
                promocodeid: 'objectID',
            },
            async handler(ctx) {

                const promocodeid = ctx.params.promocodeid;

                const result = {
                    places: [],
                    products: [],
                };
                const indexses = {};

                const places = await ctx.call('v1.places.find', {sort: 'order'});
                _.each(places, (place, i) => {
                    indexses[place._id.toString()] = i;
                    result.places.push({placeid: place._id, name: place.address, selected: false});
                });

                const products = await ctx.call('v1.products.find', {sort: 'order'});
                _.each(products, (product, i) => {
                    indexses[product._id.toString()] = i;
                    result.products.push({productid: product._id, name: product.name, selected: false});
                });

                if (_.size(products) === 0) {
                    throw new MoleculerServerError(ctx.meta.__('add-products'), 404);
                }

                if (promocodeid === 'new') {
                    return result;
                }

                const promocode = await ctx.call('v1.promocodes.findOne', {conditions: {_id: promocodeid}});
                if (!promocode) {
                    throw new MoleculerServerError(ctx.meta.__('promocode-not-found'), 404);
                }

                result.promocodeid = promocode._id;
                result.code = promocode.code;
                result.description = promocode.description;
                result.placement = promocode.placement;
                result.type = promocode.type;
                result.quantity = promocode.quantity;
                result.amount = promocode.amount;
                result.period = promocode.period;
                result.active = promocode.active;

                _.each(promocode.places, placeid => {
                    placeid = placeid.toString();
                    if (indexses[placeid] !== undefined) {
                        const index = indexses[placeid];
                        result.places[index].selected = true;
                    }
                });

                _.each(promocode.products, productid => {
                    productid = productid.toString();
                    if (indexses[productid] !== undefined) {
                        const index = indexses[productid];
                        result.products[index].selected = true;
                    }
                });

                return result;

            }
        },
        add: {
            async handler(ctx) {

                const code = _.trim(ctx.params.code);
                const description = _.trim(ctx.params.description);
                const placement = ctx.params.placement;
                const type = ctx.params.type;
                const period = ctx.params.period;
                const quantity = ctx.params.quantity;
                const amount = ctx.params.amount;
                const active = ctx.params.active === true;
                const places = ctx.params.places;
                const products = ctx.params.products;

                const set = {};
                set.code = code;
                set.description = description;
                set.placement = placement;
                set.type = type;
                set.quantity = quantity;
                set.amount = amount;
                set.active = active;
                if (period) {
                    set.period = period;
                }
                if (_.size(places)) {
                    set.places = places;
                }
                if (_.size(products)) {
                    set.products = products;
                }

                await ctx.call('v1.promocodes.create', set);

            }
        },
        edit: {
            params: {
                promocodeid: 'objectID',
            },
            async handler(ctx) {

                const promocodeid = ctx.params.promocodeid;
                const code = _.trim(ctx.params.code);
                const description = _.trim(ctx.params.description);
                const placement = ctx.params.placement;
                const type = ctx.params.type;
                const period = ctx.params.period;
                const quantity = ctx.params.quantity;
                const amount = ctx.params.amount;
                const active = ctx.params.active === true;
                const places = ctx.params.places;
                const products = ctx.params.products;

                const set = {};
                const unset = {};
                set.code = code;
                set.description = description;
                set.placement = placement;
                set.type = type;
                set.quantity = quantity;
                set.amount = amount;
                set.active = active;
                if (_.size(period)) {
                    set.period = period;
                } else {
                    unset.period = '';
                }
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

                const doc = {$set: set};
                if (_.size(unset)) {
                    doc.$unset = unset;
                }

                await ctx.call('v1.promocodes.updateOne', {filter: {_id: promocodeid}, doc});

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
                _.each(ids, (promocodeid, i) => {
                    ops.push({updateOne: {filter: {_id: promocodeid}, update: {order: i + 1}}});
                });

                await ctx.call('v1.promocodes.bulkWrite', {ops});

            }
        },

        delete: {
            params: {
                promocodeid: 'objectID',
            },
            async handler(ctx) {

                const promocodeid = ctx.params.promocodeid;

                const promocode = await ctx.call('v1.promocodes.findOne', {conditions: {_id: promocodeid}});
                if (!promocode) {
                    throw new MoleculerServerError(ctx.meta.__('promocode-not-found'), 404);
                }

                await ctx.call('v1.promocodes.deleteOne', {conditions: {_id: promocodeid}});

            }
        },

        // v1.promocodes.promocode
        promocode: {
            params: {
                customerid: 'objectID',
                code: 'string',
            },
            async handler(ctx) {

                const promocode = await ctx.call('v1.promocodes.findOne', {conditions: {code: ctx.params.code}});

                if (_.isEmpty(promocode) || promocode.active === false) {
                    throw new MoleculerServerError(ctx.meta.__('promocode-not-found'), 404);
                }

                return {
                    id: promocode._id.toString(),
                    code: promocode.code,
                    description: promocode.description,
                };

            }
        },

    }
};
