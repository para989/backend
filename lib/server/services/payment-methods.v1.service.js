const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const PaymentMethodModel = require('../models/payment-method.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;
const AuthorizeMixin = require('../mixins/authorize.mixin');

module.exports = {
    name: 'payment-methods',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: PaymentMethodModel,
    hooks: {
        before: {
            '*': 'hasAccess',
        }
    },
    settings: {
        rest: '/v1',
    },
    async started() {
        const count = await this.adapter.model.countDocuments();
        if (count === 0) {
            await this.adapter.model.create({
                name : 'Cash',
                type : 'cash',
            });
        }
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
            role: 'settings:read',
            rest: 'GET /user/payment-methods',
            async handler(ctx) {
                return await this.adapter.model.find({}, 'id name placement test type active').sort('order').exec();
            }
        },
        item: {
            role: 'settings:read',
            rest: 'GET /user/payment-method/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const result = {};

                result.places = await ctx.call('v1.places.selector');

                if (id === 'new') {
                    return result;
                }

                const method = await this.adapter.model.findOne({_id: id});
                if (!method) {
                    throw new MoleculerServerError(ctx.meta.__('payment-method-not-found'), 404);
                }

                result.method = method.toJSON();

                return result;

            }
        },
        add: {
            role: 'settings:write',
            rest: 'POST /user/payment-method',
            async handler(ctx) {

                const type = ctx.params.type;
                const test = ctx.params.test;
                const name = _.trim(ctx.params.name);
                const params = ctx.params.params;
                const placement = ctx.params.placement;
                const active = ctx.params.active === true;
                const places = ctx.params.places;

                const set = {};
                set.name = name;
                set.type = type;
                set.test = test;
                set.placement = placement;
                set.active = active;
                if (_.size(places)) {
                    set.places = places;
                }
                if (_.size(params)) {
                    set.params = params;
                }

                await ctx.call('v1.payment-methods.create', set).catch(() => {
                    throw new MoleculerServerError(ctx.meta.__('payment-method-exists'));
                });

                await this.broker.broadcast('content:updated');

            }
        },
        edit: {
            role: 'settings:write',
            rest: 'PATCH /user/payment-method',
            async handler(ctx) {

                const id = ctx.params.id;
                const type = ctx.params.type;
                const test = ctx.params.test;
                const name = _.trim(ctx.params.name);
                const params = ctx.params.params;
                const placement = ctx.params.placement;
                const active = ctx.params.active === true;
                const places = ctx.params.places;

                const set = {};
                const unset = {};
                set.name = name;
                set.type = type;
                set.test = test;
                set.placement = placement;
                set.active = active;
                if (_.size(places)) {
                    set.places = places;
                } else {
                    unset.places = '';
                }
                if (_.size(params)) {
                    set.params = params;
                } else {
                    unset.params = '';
                }

                const doc = {$set: set};
                if (_.size(unset)) {
                    doc.$unset = unset;
                }

                await ctx.call('v1.payment-methods.updateOne', {filter: {_id: id}, doc}).catch(() => {
                    throw new MoleculerServerError(ctx.meta.__('payment-method-exists'));
                });

                await this.broker.broadcast('content:updated');

            }
        },
        sort: {
            role: 'settings:write',
            rest: 'PUT /user/payment-methods',
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

                await ctx.call('v1.payment-methods.bulkWrite', {ops});

                await this.broker.broadcast('content:updated');

            }
        },
        delete: {
            role: 'settings:write',
            rest: 'DELETE /user/payment-method/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const count = await this.adapter.model.countDocuments();
                if (count < 2) {
                    throw new MoleculerServerError(ctx.meta.__('singe-payment-method'));
                }

                const id = ctx.params.id;

                const method = await ctx.call('v1.payment-methods.findOne', {conditions: {_id: id}});
                if (!method) {
                    throw new MoleculerServerError(ctx.meta.__('payment-method-not-found'), 404);
                }

                await ctx.call('v1.payment-methods.deleteOne', {conditions: {_id: id}});

                await this.broker.broadcast('content:updated');

            }
        },
    },
};
