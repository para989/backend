const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const GiftModel = require('../models/gift.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;
const AuthorizeMixin = require('../mixins/authorize.mixin');

module.exports = {
    name: 'gifts',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: GiftModel,
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
            rest: 'GET /user/gifts',
            async handler(ctx) {
                return await this.adapter.model.find({}, 'id name placement description active').sort('order').exec();
            }
        },
        item: {
            role: 'marketing:read',
            rest: 'GET /user/gift/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const result = {};

                result.places = await ctx.call('v1.places.selector');

                result.products = await ctx.call('v1.products.selector');
                if (_.size(result.products) === 0) {
                    throw new MoleculerServerError(ctx.meta.__('add-products'), 404);
                }

                if (id === 'new') {
                    return result;
                }

                const gift = await this.adapter.model.findOne({_id: id});
                if (!gift) {
                    throw new MoleculerServerError(ctx.meta.__('gift-not-found'), 404);
                }

                result.gift = gift.toJSON();

                return result;

            }
        },
        add: {
            role: 'marketing:write',
            rest: 'POST /user/gift',
            async handler(ctx) {

                /*const count = await this.adapter.model.countDocuments();
                if (count > 0) {
                    throw new MoleculerServerError(ctx.meta.__('already-added'));
                }*/

                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const message = _.trim(ctx.params.message);
                const placement = ctx.params.placement;
                const quantity = ctx.params.quantity;
                const active = ctx.params.active === true;
                const places = ctx.params.places;
                const products = ctx.params.products;
                const gifts = ctx.params.gifts;
                const icon = ctx.params.icon;

                const set = {};
                set.name = name;
                set.description = description;
                set.message = message;
                set.placement = placement;
                set.quantity = quantity;
                set.active = active;
                if (icon) {
                    set.icon = icon;
                }
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

                await this.broker.broadcast('content:updated');

            }
        },
        edit: {
            role: 'marketing:write',
            rest: 'PATCH /user/gift',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;
                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const message = _.trim(ctx.params.message);
                const placement = ctx.params.placement;
                const quantity = ctx.params.quantity;
                const active = ctx.params.active === true;
                const places = ctx.params.places;
                const products = ctx.params.products;
                const gifts = ctx.params.gifts;
                const icon = ctx.params.icon;

                const set = {};
                const unset = {};
                set.name = name;
                set.description = description;
                set.message = message;
                set.placement = placement;
                set.quantity = quantity;
                set.active = active;
                if (icon) {
                    set.icon = icon;
                } else {
                    unset.icon = '';
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
                if (_.size(gifts)) {
                    set.gifts = gifts;
                } else {
                    unset.gifts = '';
                }

                const doc = {$set: set};
                if (_.size(unset)) {
                    doc.$unset = unset;
                }

                await ctx.call('v1.gifts.updateOne', {filter: {_id: id}, doc});

                await this.broker.broadcast('content:updated');

            }
        },
        sort: {
            role: 'marketing:write',
            rest: 'PUT /user/gifts',
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

                await ctx.call('v1.gifts.bulkWrite', {ops});

                await this.broker.broadcast('content:updated');

            }
        },
        delete: {
            role: 'marketing:write',
            rest: 'DELETE /user/gift/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const gift = await ctx.call('v1.gifts.findOne', {query: {_id: id}});
                if (!gift) {
                    throw new MoleculerServerError(ctx.meta.__('gift-not-found'), 404);
                }

                await ctx.call('v1.gifts.deleteOne', {query: {_id: id}});

                await ctx.call('v1.customer-gifts.deleteMany', {query: {gift: id}});

                await this.broker.emit('gift:deleted', {gift});

                await this.broker.broadcast('content:updated');

            }
        },
        selector: {
            rest: 'GET /gifts',
            cache: false,
            async handler(ctx) {
                return await this.adapter.model.find({}, 'id name').sort('order').exec();
            }
        },
    }
};
