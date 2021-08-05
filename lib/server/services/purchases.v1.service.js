const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const PurchaseModel = require('../models/purchase.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {formatISO} = require("date-fns");

module.exports = {
    name: 'purchases',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: PurchaseModel,
    hooks: {
        before: {
            '*': 'hasAccess',
        }
    },
    settings: {
        rest: '/v1',
    },
    events: {
        'order:created': {
            async handler(ctx) {
                const order = ctx.params.order;
                const date = formatISO(new Date(), {representation: 'date'});
                const ops = [];
                ops.push({
                    updateOne: {
                        filter: {date, object: order.place},
                        update: {$set: {date, type: 'place', object: order.place, revenue: order.amount}, $inc: {total: 1}},
                        upsert: true,
                    }
                });
                _.each(order.items, item => {
                    ops.push({
                        updateOne: {
                            filter: {date, object: item.product},
                            update: {$set: {date, type: 'product', object: item.product, revenue: item.amount}, $inc: {total: item.quantity}},
                            upsert: true,
                        }
                    });
                });
                if (_.size(ops)) {
                    await this.adapter.model.bulkWrite(ops);
                }
            },
        },
        'season:purchased': {
            async handler(ctx) {
                const season = ctx.params.season;
                const date = formatISO(new Date(), {representation: 'date'});
                await this.adapter.model.updateOne(
                    {date, object: season._id},
                    {$set: {date, type: 'season', object: season._id, revenue: season.amount}, $inc: {total: 1}},
                    {upsert: true},
                );
            },
        },
        'place:deleted': {
            async handler(ctx) {
                const place = ctx.params.place;
                await this.adapter.model.deleteMany({object: place._id});
            },
        },
        'product:deleted': {
            async handler(ctx) {
                const product = ctx.params.product;
                await this.adapter.model.deleteMany({object: product._id});
            },
        },
        'season:deleted': {
            async handler(ctx) {
                const season = ctx.params.season;
                await this.adapter.model.deleteMany({object: season._id});
            },
        },
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
        purchases: {
            rest: 'GET /purchases/:type',
            params: {
                type: {
                    type: 'string',
                    enum: ['place', 'product', 'season'],
                },
            },
            async handler(ctx) {
                const type = ctx.params.type;
                const purchases = await this.adapter.model.find({type}, 'id type date total revenue')
                    .populate({path: 'object', select: type === 'place' ? 'id address' : 'id name'})
                    .sort('-date')
                    .exec();
                const items = [];
                _.each(purchases, purchase => {
                    purchase = purchase.toObject({virtuals: true});
                    delete purchase._id;
                    delete purchase.type;
                    delete purchase.object._id;
                    if (type === 'place') {
                        purchase.object.name = purchase.object.address;
                        delete purchase.object.address;
                    }
                    purchase.date = formatISO(purchase.date, {representation: 'date'});
                    items.push(purchase);
                });
                return items;
            }
        },
    }
};
