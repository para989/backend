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
    async started() {
        clearCustomerSeasonsQueue.process(this.clear);
        clearCustomerSeasonsQueue.add({}, {repeat: {cron: '0 0 * * *'}, removeOnComplete: true});
    },
    actions: {
        get: {
            cache: false,
        },
        find: {
            cache: false,
        },
        // v1.customer-seasons.items
        items: {
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
