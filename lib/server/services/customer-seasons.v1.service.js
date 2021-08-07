const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const CustomerSeasonModel = require('../models/customer-season.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;

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
    events: {
        'season:deleted': {
            async handler(ctx) {
                const season = ctx.params.season;
                await this.adapter.model.deleteMany({season: season._id});
            }
        },
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
        // v1.customer-seasons.customer
        customer: {
            rest: 'GET /customer/seasons/:customerid',
            cache: false,
            params: {
                customerid: 'objectID',
            },
            async handler(ctx) {
                const seasons = [];
                const items = await this.adapter.model.find({customer: ctx.params.customerid});
                _.each(items, item => {
                    seasons.push({
                        id: _.toString(item._id),
                        season: _.toString(item.season),
                        place: _.toString(item.place),
                        date: item.date,
                    });
                });
                return seasons;
            },
        },
        // v1.customer-seasons.purchases
        purchases: {
            cache: false,
            params: {
                seasonid: 'objectID',
            },
            async handler(ctx) {
                const purchases = [];
                const items = await this.adapter.model.find({season: ctx.params.seasonid})
                    .populate({path: 'customer', select: 'id name phone email'})
                    .populate({path: 'place', select: 'id address'})
                    .sort('-date')
                    .limit(1000)
                    .exec();
                _.each(items, item => {
                    purchases.push({
                        id: item.id,
                        customer: item.customer,
                        place: item.place,
                        date: item.date,
                    });
                });
                return purchases;
            },
        },
        // v1.reviews.delete
        delete: {
            role: 'marketing:write',
            rest: 'DELETE /user/customer-seasons/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const season = await this.adapter.model.findOne({_id: id});
                if (!season) {
                    throw new MoleculerServerError(ctx.meta.__('season-not-found'), 404);
                }

                await this.adapter.model.deleteOne({_id: id});

            }
        },
    },
    methods: {
        async clear(job, done) {
            await this.adapter.model.deleteMany({date: {$lt: Date.now()}});
            done();
        },
    },
};
