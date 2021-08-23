const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const SoldOutModel = require('../models/sold-out.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;
const each = require('each');
const AuthorizeMixin = require('../mixins/authorize.mixin');

module.exports = {
    name: 'sold-out',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: SoldOutModel,
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
            rest: 'GET /(user|customer)/sold-out/:id?',
            cache: false,
            params: {
                id: {
                    type: 'objectID',
                    optional: true,
                },
            },
            async handler(ctx) {
                const result = [];
                let id = ctx.params.id;
                if (_.isEmpty(id) && _.size(_.get(ctx.meta, 'user.places'))) {
                    id = _.get(ctx.meta, 'user.places.0');
                }
                const items = await this.adapter.model.find({place: id}).exec();
                _.each(items, item => {
                    result.push(item.product);
                });
                return result;
            },
        },
        add: {
            role: 'orders:write',
            rest: 'POST /user/sold-out',
            cache: false,
            params: {
                productid: 'objectID',
            },
            async handler(ctx) {

                const productid = ctx.params.productid;
                const places = _.get(ctx.meta, 'user.places');

                if (_.size(places)) {

                    const product = await ctx.call('v1.products.findOne', {query: {_id: productid}});
                    if (!product) {
                        throw new MoleculerServerError(ctx.meta.__('product-not-found'), 404);
                    }

                    const ops = [];
                    _.each(places, place => {
                        ops.push({
                            updateOne: {
                                filter: {product: productid, place},
                                update: {product: productid, place},
                                upsert: true,
                            }
                        });
                    });
                    await this.adapter.model.bulkWrite(ops);

                    this.update(places);

                    return await this.actions.items({id: places[0]});

                }

                return {ok: true};

            },
        },
        delete: {
            role: 'orders:write',
            rest: 'DELETE /user/sold-out/:productid',
            cache: false,
            params: {
                productid: 'objectID',
            },
            async handler(ctx) {

                const productid = ctx.params.productid;
                const places = _.get(ctx.meta, 'user.places');

                if (_.size(places)) {

                    const product = await ctx.call('v1.products.findOne', {query: {_id: productid}});
                    if (!product) {
                        throw new MoleculerServerError(ctx.meta.__('product-not-found'), 404);
                    }

                    const ops = [];
                    _.each(places, place => {
                        ops.push({
                            deleteOne: {
                                filter: {product: productid, place},
                            }
                        });
                    });
                    await this.adapter.model.bulkWrite(ops);

                    this.update(places);

                    return await this.actions.items({id: places[0]});

                }

                return {ok: true};

            },
        },
    },
    methods: {
        async update(places) {
            const actions = [];
            each(places).call(async (id, index, done) => {
                const items = await this.actions.items({id});
                console.log(items);
                actions.push({
                    action: 'v1.io.emit', params: {
                        room: `place-${id}`,
                        event: 'sold-out',
                        data: {items}
                    }
                });
                done();
            }).next(async (err) => {
                if (_.size(actions)) {
                    await this.broker.mcall(actions);
                }
            });
        },
    },
};
