const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const CustomerBonuseModel = require('../models/customer-bonus.model');
const MongooseMixin = require('../mixins/mongoose.mixin');

module.exports = {
    name: 'customer-bonuses',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: CustomerBonuseModel,
    settings: {
        rest: '/v1',
    },
    events: {
        'order:updated': {
            async handler(ctx) {

                const order = ctx.params.order;

                if (order.status !== 'finished') {
                    return;
                }

                const i18n = this.broker.metadata.i18n;
                const active = _.get(this.broker.metadata, 'cashback.active') === true;
                const percentage = _.get(this.broker.metadata, 'cashback.percentage');
                // const maximum = _.get(this.broker.metadata, 'cashback.maximum');

                if (!active) {
                    return;
                }

                const customerid = order.customer;
                const amount = Math.floor(order.amount * percentage / 100);

                await this.adapter.model.create({customer: customerid, amount});

                await this.broker.emit('bonus:created', {customerid, amount});

                await this.broker.call('v1.notifications.push', {
                    customerid,
                    title: i18n.__('cashback-title'),
                    message: i18n.__('cashback-message', order.name, amount),
                });

            }
        },
        'mystery:shopper:finished': {
            async handler(ctx) {

                const enabled = _.get(this.broker.metadata, 'mysteryShopper.enabled', false);
                const amount = _.get(this.broker.metadata, 'mysteryShopper.bonuses', 0);

                if (!enabled) {
                    return;
                }

                const placeid = ctx.params.placeid;
                const customerid = ctx.params.customerid;

                await this.adapter.model.create({customer: customerid, amount});

                await this.broker.emit('bonus:created', {placeid, customerid, amount});

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
        // v1.customer-bonuses.items
        items: {
            rest: 'GET /customer/bonuses/:customerid',
            cache: false,
            params: {
                customerid: 'objectID',
            },
            async handler(ctx) {
                const bonuses = [];
                const items = await ctx.call('v1.customer-bonuses.find', {query: {customer: ctx.params.customerid}, sort: '-date'});
                _.each(items, item => {
                    bonuses.push({
                        id: item._id,
                        amount: item.amount,
                        date: item.date,
                    });
                });
                return bonuses;
            },
        },
    }
};
