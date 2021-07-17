const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const PromoCodeModel = require('../models/promocode.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;
const AuthorizeMixin = require('../mixins/authorize.mixin');

module.exports = {
    name: 'promocodes',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: PromoCodeModel,
    hooks: {
        before: {
            '*': 'hasAccess',
        }
    },
    settings: {
        rest: '/v1',
    },
    actions: {
        get: {
            rest: false,
            cache: false,
        },
        find: {
            cache: false,
        },
        list: {
            rest: false,
            cache: false,
        },
        create: {
            rest: false,
        },
        update: {
            rest: false,
        },
        remove: {
            rest: false,
        },
        items: {
            role: 'marketing:read',
            rest: 'GET /user/promocodes',
            async handler(ctx) {
                return await this.adapter.model.find({}, 'id code placement description active').sort('order').exec();
            }
        },
        item: {
            role: 'marketing:read',
            rest: 'GET /user/promocode/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const result = {
                    places: [],
                    products: [],
                };

                result.places = await ctx.call('v1.places.selector');

                result.products = await ctx.call('v1.products.selector');
                if (_.size(result.products) === 0) {
                    throw new MoleculerServerError(ctx.meta.__('add-products'), 404);
                }

                if (id === 'new') {
                    return result;
                }

                const promocode = await this.adapter.model.findOne({_id: id});
                if (!promocode) {
                    throw new MoleculerServerError(ctx.meta.__('promocode-not-found'), 404);
                }

                result.promocode = promocode.toJSON();

                return result;

            }
        },
        add: {
            role: 'marketing:write',
            rest: 'POST /user/promocode',
            async handler(ctx) {

                const code = _.trim(ctx.params.code);
                const description = _.trim(ctx.params.description);
                const placement = ctx.params.placement;
                const type = ctx.params.type;
                const period = ctx.params.period;
                const quantity = ctx.params.quantity;
                const amount = ctx.params.amount;
                const once = ctx.params.once;
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
                set.once = once;
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
            role: 'marketing:write',
            rest: 'PATCH /user/promocode',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;
                const code = _.trim(ctx.params.code);
                const description = _.trim(ctx.params.description);
                const placement = ctx.params.placement;
                const type = ctx.params.type;
                const period = ctx.params.period;
                const quantity = ctx.params.quantity;
                const amount = ctx.params.amount;
                const once = ctx.params.once;
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
                set.once = once;
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

                await ctx.call('v1.promocodes.updateOne', {filter: {_id: id}, doc});

            }
        },
        sort: {
            role: 'marketing:write',
            rest: 'PUT /user/promocodes',
            params: {
                ids: {
                    type: 'array',
                },
            },
            async handler(ctx) {

                const ids = ctx.params.ids;
                const ops = [];
                _.each(ids, (id, i) => {
                    ops.push({updateOne: {filter: {_id: id}, update: {order: i + 1}}});
                });

                await ctx.call('v1.promocodes.bulkWrite', {ops});

            }
        },
        delete: {
            role: 'marketing:write',
            rest: 'DELETE /user/promocode/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const promocode = await ctx.call('v1.promocodes.findOne', {conditions: {_id: id}});
                if (!promocode) {
                    throw new MoleculerServerError(ctx.meta.__('promocode-not-found'), 404);
                }

                await ctx.call('v1.promocodes.deleteOne', {conditions: {_id: id}});

            }
        },
        // v1.promocodes.promocode
        promocode: {
            rest: 'POST /customer/promocode',
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
