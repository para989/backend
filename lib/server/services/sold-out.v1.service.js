const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const SoldOutModel = require('../models/sold-out.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;
const each = require('each');

module.exports = {
    name: 'sold-out',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: SoldOutModel,
    actions: {
        get: {
            cache: false,
        },
        find: {
            cache: false,
        },
        // v1.sold-out.items
        items: {
            cache: false,
            params: {
                placeid: {
                    type: 'objectID',
                    optional: true,
                },
            },
            async handler(ctx) {
                const result = [];
                let placeid = ctx.params.placeid;
                if (_.isEmpty(placeid) && _.size(_.get(ctx.meta, 'user.places'))) {
                    placeid = _.get(ctx.meta, 'user.places.0');
                }
                const items = await this.adapter.model.find({place: placeid}).exec();
                _.each(items, item => {
                    result.push(item.product);
                });
                return result;
            },
        },
        // v1.sold-out.add
        add: {
            cache: false,
            params: {
                productid: 'objectID',
            },
            async handler(ctx) {

                const productid = ctx.params.productid;
                const places = _.get(ctx.meta, 'user.places');

                if (_.size(places)) {

                    const product = await ctx.call('v1.products.findOne', {conditions: {_id: productid}});
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

                    return await this.actions.items({placeid: places[0]});

                }

                return {ok: true};

            },
        },
        // v1.sold-out.delete
        delete: {
            cache: false,
            params: {
                productid: 'objectID',
            },
            async handler(ctx) {

                const productid = ctx.params.productid;
                const places = _.get(ctx.meta, 'user.places');

                if (_.size(places)) {

                    const product = await ctx.call('v1.products.findOne', {conditions: {_id: productid}});
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

                    return await this.actions.items({placeid: places[0]});

                }

                return {ok: true};

            },
        },
    },
    methods: {
        async update(places) {
            const actions = [];
            each(places).call(async (placeid, index, done) => {
                const items = await this.actions.items({placeid});
                actions.push({
                    action: 'v1.io.emit', params: {
                        room: `place-${placeid}`,
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
