const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const CustomerBalanceModel = require('../models/customer-balance.model');
const MongooseMixin = require('../mixins/mongoose.mixin');

module.exports = {
    name: 'customer-balances',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: CustomerBalanceModel,
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
        // v1.customer-balances.items
        items: {
            rest: 'GET /customer/balances/:customerid',
            cache: false,
            params: {
                customerid: 'objectID',
            },
            async handler(ctx) {
                const balances = [];
                const items = await ctx.call('v1.customer-balances.find', {query: {customer: ctx.params.customerid}, sort: '-date'});
                _.each(items, item => {
                    balances.push({
                        id: item._id,
                        amount: item.amount,
                        date: item.date,
                    });
                });
                return balances;
            },
        },
    }
};
