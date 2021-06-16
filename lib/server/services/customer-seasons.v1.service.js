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
            /*{
                "customer" : ObjectId("6b7943c50000000000000000"),
                "created" : ISODate("2021-05-30T08:00:04.295Z"),
                "date" : ISODate("2021-07-01T16:56:27.825Z"),
                "place" : ObjectId("6033becf96d0c3608cf5a58f"),
                "season" : ObjectId("6033c3f06f2e366190773901"),
                "updated" : ISODate("2021-06-15T12:24:55.176Z")
            }*/
        },
    },
};
