const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const StatisticModel = require('../models/statistic.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {formatISO} = require('date-fns');

module.exports = {
    name: 'statistics',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: StatisticModel,
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
                        filter: {date},
                        update: {$inc: {'places.purchases': 1}},
                        upsert: true,
                    }
                });
                ops.push({
                    updateOne: {
                        filter: {date},
                        update: {$inc: {'orders.total': 1}},
                        upsert: true,
                    }
                });
                ops.push({
                    updateOne: {
                        filter: {date},
                        update: {$inc: {'orders.revenue': order.amount}},
                        upsert: true,
                    }
                });
                _.each(order.items, item => {
                    ops.push({
                        updateOne: {
                            filter: {date},
                            update: {$inc: {'products.purchases': item.quantity}},
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
                const date = formatISO(new Date(), {representation: 'date'});
                await this.adapter.model.updateOne(
                    {date},
                    {$inc: {'seasons.purchases': 1}},
                    {upsert: true},
                );
            },
        },
        'customer:created': {
            async handler(ctx) {
                const date = formatISO(new Date(), {representation: 'date'});
                await this.adapter.model.updateOne(
                    {date},
                    {$inc: {'customers.total': 1}},
                    {upsert: true},
                );
            },
        },
        'review:created': {
            async handler(ctx) {
                const review = ctx.params.review;
                const date = formatISO(new Date(), {representation: 'date'});
                switch (review.type) {
                    case 'place':
                        await this.adapter.model.updateOne(
                            {date},
                            {$inc: {'places.reviews': 1}},
                            {upsert: true},
                        );
                        break;
                    case 'product':
                        await this.adapter.model.updateOne(
                            {date},
                            {$inc: {'products.reviews': 1}},
                            {upsert: true},
                        );
                        break;
                    case 'season':
                        await this.adapter.model.updateOne(
                            {date},
                            {$inc: {'seasons.reviews': 1}},
                            {upsert: true},
                        );
                        break;
                }
            },
        },
        'platforms:updated': {
            async handler(ctx) {
                // platforms.ios
                // platforms.android
                // platforms.site
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
        statistics: {
            rest: 'GET /statistics/:type',
            params: {
                type: {
                    type: 'string',
                    enum: ['orders', 'customers'],
                },
            },
            async handler(ctx) {
                const type = ctx.params.type;
                const statistics = await this.adapter.model.find({}, `id date ${type}`)
                    .sort('-date')
                    .exec();
                const items = [];
                _.each(statistics, statistic => {
                    items.push({
                        id: statistic.id,
                        date: formatISO(statistic.date, {representation: 'date'}),
                        total: _.get(statistic, [type, 'total']),
                    });
                });
                return items;
            }
        },
    }
};
