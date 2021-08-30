const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const PurchaseModel = require('../models/purchase.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {formatISO} = require('date-fns');

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
    /*async started() {
        setTimeout(async () => {
            const id = '6033c3f06f2e366190773901';
            const payments = await this.broker.call('v1.payments.find', {
                query: {object: id, status: 'success'},
                sort: 'created',
            });
            const data = {};
            _.each(payments, payment => {
                const date = formatISO(payment.created, {representation: 'date'});
                if (!data[date]) {
                    data[date] = {total: 0, revenue: 0};
                }
                data[date].total += 1;
                data[date].revenue += payment.amount;
            });
            const ops = [];
            _.each(data, (item, date) => {
                ops.push({
                    updateOne: {
                        filter: {date, object: id},
                        update: {$set: {date, type: 'season', object: id, revenue: item.revenue, total: item.total}},
                        upsert: true,
                    }
                });
            });
            if (_.size(ops)) {
                await this.adapter.model.bulkWrite(ops);
            }
        }, 5000);
    },*/
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
            role: 'reports:read',
            rest: 'GET /user/purchases/:type',
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
