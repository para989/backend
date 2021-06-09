const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const PaymentMethodModel = require('../models/payment-method.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;

module.exports = {
    name: 'payment-methods',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: PaymentMethodModel,
    async started() {
        const count = await this.adapter.model.countDocuments();
        if (count === 0) {
            await this.adapter.model.create({
                name : 'Cash',
                type : 'cash'
            });
        }
    },
    actions: {
        get: {
            cache: false,
        },
        find: {
            cache: false,
        },
        items: {
            async handler(ctx) {

                const result = [];

                const methods = await ctx.call('v1.payment-methods.find', {sort: 'order'});
                _.each(methods, method => {
                    result.push({
                        methodid: method._id.toString(),
                        name: method.name,
                        test: method.test,
                        type: method.type,
                        placement: method.placement,
                    });
                });

                return result;

            }
        },
        item: {
            params: {
                methodid: 'objectID',
            },
            async handler(ctx) {

                const methodid = ctx.params.methodid;

                const method = await ctx.call('v1.payment-methods.findOne', {conditions: {_id: methodid}});
                if (!method) {
                    throw new MoleculerServerError('Method not found', 404);
                }

                return {
                    methodid: method._id.toString(),
                    name: method.name,
                    type: method.type,
                    test: method.test,
                    params: method.params,
                    placement: method.placement,
                };

            }
        },
        add: {
            async handler(ctx) {

                const type = ctx.params.type;
                const test = ctx.params.test;
                const name = _.trim(ctx.params.name);
                const params = ctx.params.params;
                const placement = ctx.params.placement;

                const set = {};
                set.name = name;
                set.type = type;
                set.test = test;
                set.placement = placement;

                if (_.size(params)) {
                    set.params = params;
                }

                await ctx.call('v1.payment-methods.create', set).catch(() => {
                    throw new MoleculerServerError(ctx.meta.__('payment-method-exists'));
                });

            }
        },
        edit: {
            async handler(ctx) {

                const methodid = ctx.params.methodid;
                const type = ctx.params.type;
                const test = ctx.params.test;
                const name = _.trim(ctx.params.name);
                const params = ctx.params.params;
                const placement = ctx.params.placement;

                const set = {};
                const unset = {};
                set.name = name;
                set.type = type;
                set.test = test;
                set.placement = placement;

                if (_.size(params)) {
                    set.params = params;
                } else {
                    unset.params = '';
                }

                const doc = {$set: set};
                if (_.size(unset)) {
                    doc.$unset = unset;
                }

                await ctx.call('v1.payment-methods.updateOne', {filter: {_id: methodid}, doc}).catch(() => {
                    throw new MoleculerServerError(ctx.meta.__('payment-method-exists'));
                });

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
                _.each(ids, (methodid, i) => {
                    ops.push({updateOne: {filter: {_id: methodid}, update: {order: i + 1}}});
                });

                await ctx.call('v1.payment-methods.bulkWrite', {ops});

            }
        },
        delete: {
            params: {
                methodid: 'objectID',
            },
            async handler(ctx) {

                const count = await this.adapter.model.countDocuments();
                if (count < 2) {
                    throw new MoleculerServerError(ctx.meta.__('singe-payment-method'));
                }

                const methodid = ctx.params.methodid;

                const method = await ctx.call('v1.payment-methods.findOne', {conditions: {_id: methodid}});
                if (!method) {
                    throw new MoleculerServerError('Method not found', 404);
                }

                await ctx.call('v1.payment-methods.deleteOne', {conditions: {_id: methodid}});

            }
        },
    },
};
