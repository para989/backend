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
    actions: {
        get: {
            cache: false,
        },
        find: {
            cache: false,
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
