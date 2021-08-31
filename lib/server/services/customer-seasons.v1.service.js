const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const CustomerSeasonModel = require('../models/customer-season.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;
const AuthorizeMixin = require('../mixins/authorize.mixin');

const Queue = require('bull');
const clearCustomerSeasonsQueue = new Queue('clear-customer-seasons', {redis: global.REDIS});

module.exports = {
    name: 'customer-seasons',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: CustomerSeasonModel,
    hooks: {
        before: {
            '*': 'hasAccess',
        }
    },
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
    async created() {
        clearCustomerSeasonsQueue.process(this.clear);
    },
    async started() {
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
        // User
        items: {
            role: 'marketing:read',
            rest: 'GET /user/customer-seasons/:seasonid',
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
        item: {
            role: 'marketing:read',
            rest: 'GET /user/customer-season/:id',
            cache: false,
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const result = {};

                const places = await ctx.call('v1.places.selector');
                if (_.size(places) === 0) {
                    throw new MoleculerServerError(ctx.meta.__('place-not-found'), 404);
                }

                result.places = places;

                if (id === 'new') {
                    return result;
                }

                const customerSeason = await this.adapter.model.findOne({_id: id})
                    .populate({path: 'customer', select: 'id name phone email'})
                    .exec();
                if (!customerSeason) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }

                result.customerSeason = customerSeason.toJSON();

                return result;

            }
        },
        add: {
            role: 'marketing:write',
            rest: 'POST /user/customer-season',
            cache: false,
            async handler(ctx) {

                const login = _.trim(_.toLower(ctx.params.login));
                const placeid = ctx.params.placeid;
                const seasonid = ctx.params.seasonid;
                const date = ctx.params.date;

                const customer = await ctx.call('v1.customers.findOne', {query: {$or: [{phone: login}, {email: login}]}});
                if (!customer) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }

                const doc = {};
                doc.customer = customer._id;
                doc.place = placeid;
                doc.season = seasonid;
                doc.date = date;

                await this.adapter.model.create(doc).catch(() => {
                    throw new MoleculerServerError(ctx.meta.__('purchase-exists'));
                });

                return {ok: true};

            }
        },
        edit: {
            role: 'marketing:write',
            rest: 'PATCH /user/customer-season',
            cache: false,
            async handler(ctx) {

                const id = ctx.params.id;
                const placeid = ctx.params.placeid;
                const date = ctx.params.date;

                const customerSeason = await this.adapter.model.findOne({_id: id});
                if (!customerSeason) {
                    throw new MoleculerServerError(ctx.meta.__('season-not-found'), 404);
                }

                const doc = {};
                doc.place = placeid;
                doc.date = date;

                await this.adapter.model.updateOne({_id: id}, doc).catch(() => {
                    throw new MoleculerServerError(ctx.meta.__('purchase-exists'));
                });

                return {ok: true};

            }
        },
        delete: {
            role: 'marketing:write',
            rest: 'DELETE /user/customer-season/:id',
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
        // Customer
        customer: {
            rest: 'GET /customer/seasons/:customerid/:placeid?',
            cache: false,
            params: {
                customerid: 'objectID',
                placeid: {
                    type: 'objectID',
                    optional: true,
                },
            },
            async handler(ctx) {
                const customerid = ctx.params.customerid;
                const placeid = ctx.params.placeid;
                const seasons = [];
                const query = {customer: customerid};
                if (placeid) {
                    query.place = placeid;
                }
                const items = await this.adapter.model.find(query);
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
    },
    methods: {
        async clear(job, done) {
            await this.adapter.model.deleteMany({date: {$lt: Date.now()}});
            done();
        },
    },
};
