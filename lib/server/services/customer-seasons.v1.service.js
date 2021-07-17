const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const CustomerSeasonModel = require('../models/customer-season.model');
const MongooseMixin = require('../mixins/mongoose.mixin');

const Queue = require('bull');
const clearCustomerSeasonsQueue = new Queue('clear-customer-seasons', {redis: global.REDIS});

module.exports = {
    name: 'customer-seasons',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: CustomerSeasonModel,
    settings: {
        rest: '/v1',
    },
    async started() {
        clearCustomerSeasonsQueue.process(this.clear);
        clearCustomerSeasonsQueue.add({}, {repeat: {cron: '0 0 * * *'}, removeOnComplete: true});
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
        // v1.customer-seasons.items
        items: {
            rest: 'GET /customer/seasons/:customerid',
            cache: false,
            params: {
                customerid: 'objectID',
            },
            async handler(ctx) {
                const customerSeasons = [];
                const items = await this.adapter.model.find({customer: ctx.params.customerid});
                _.each(items, item => {
                    customerSeasons.push({
                        id: _.toString(item._id),
                        season: _.toString(item.season),
                        place: _.toString(item.place),
                        date: item.date,
                    });
                });
                return customerSeasons;
            },
        },
    },
    methods: {
        async clear(job, done) {
            await this.adapter.model.deleteMany({date: {$lt: Date.now()}});
            done();
        },
    },
};
