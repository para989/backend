const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const CustomerSeasonModel = require('../models/customer-season.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const Queue = require('bull');
const syncCustomerSeasonsQueue = new Queue('sync-customer-seasons', {redis: global.REDIS});

module.exports = {
    name: 'customer-seasons',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: CustomerSeasonModel,
    async started() {
        syncCustomerSeasonsQueue.process(this.sync);
        syncCustomerSeasonsQueue.add({}, {repeat: {cron: '0 0 * * *'}, removeOnComplete: true});
        /*setTimeout(async () => {
            const moment = require('moment');
            const payments = await this.broker.call('v1.payments.find', {conditions: {cause: 'season', status: 'success'}});
            const ops = [];
            _.each(payments, payment => {
                const update = {
                    customer: payment.customer,
                    place: payment.place,
                    season: payment.object,
                    date: moment().add(14, 'days'),
                };
                ops.push({updateOne: {filter: {customer: payment.customer}, update, upsert: true}});
                console.log(update);
            });
            await this.broker.call('v1.customer-seasons.bulkWrite', {ops});
        }, 5000);*/
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
        async sync(job, done) {
            await this.adapter.model.deleteMany({date: {$lt: Date.now()}});
            done();
        },
    },
};
