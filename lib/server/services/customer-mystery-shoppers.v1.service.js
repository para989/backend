const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const CustomerMysteryShopperModel = require('../models/customer-mystery-shopper.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;
const {isTest} = require('../helpers/test');
const AuthorizeMixin = require('../mixins/authorize.mixin');

module.exports = {
    name: 'customer-mystery-shoppers',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: CustomerMysteryShopperModel,
    hooks: {
        before: {
            '*': 'hasAccess',
        }
    },
    settings: {
        rest: '/v1',
    },
    events: {
        'customer:deleted': {
            async handler(ctx) {
                const customer = ctx.params.customer;
                await this.adapter.model.deleteMany({customer: customer._id});
            }
        },
        'inspection:created': {
            async handler(ctx) {
                const customer = ctx.params.customer;
                await this.adapter.model.updateOne({customer: customer._id}, {status: 'verifying'});
            }
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
        // User
        items: {
            role: 'customers:read',
            rest: 'GET /user/mystery-shoppers',
            cache: false,
            async handler(ctx) {
                const mysteryShoppers = [];
                const items = await this.adapter.model.find()
                    .populate({path: 'customer', select: 'id name phone email'})
                    .populate({path: 'place', select: 'id address'})
                    .sort('-created')
                    .limit(1000)
                    .exec();
                _.each(items, item => {
                    mysteryShoppers.push({
                        id: item.id,
                        customer: item.customer,
                        place: item.place,
                        status: item.status,
                    });
                });
                return mysteryShoppers;
            },
        },
        item: {
            role: 'customers:read',
            rest: 'GET /user/mystery-shopper/:id',
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

                const mysteryShopper = await this.adapter.model.findOne({_id: id})
                    .populate({path: 'customer', select: 'id name phone email'})
                    .exec();
                if (!mysteryShopper) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }

                result.mysteryShopper = mysteryShopper.toJSON();

                return result;

            }
        },
        add: {
            role: 'customers:write',
            rest: 'POST /user/mystery-shopper',
            cache: false,
            async handler(ctx) {

                const login = _.trim(_.toLower(ctx.params.login));
                const place = ctx.params.place;
                const status = ctx.params.status;

                const customer = await ctx.call('v1.customers.findOne', {query: {$or: [{phone: login}, {email: login}]}});
                if (!customer) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }

                const doc = {};
                doc.place = place;
                doc.customer = customer._id;
                doc.status = status;

                await this.adapter.model.create(doc).catch(() => {
                    throw new MoleculerServerError(ctx.meta.__('customer-exists'));
                });

                if (status === 'working') {
                    this.push(customer._id);
                }

                return {ok: true};

            }
        },
        edit: {
            role: 'customers:write',
            rest: 'PATCH /user/mystery-shopper',
            cache: false,
            async handler(ctx) {

                const id = ctx.params.id;
                const place = ctx.params.place;
                const status = ctx.params.status;

                const mysteryShopper = await this.adapter.model.findOne({_id: id});
                if (!mysteryShopper) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }

                const doc = {};
                doc.place = place;
                doc.status = status;

                await this.adapter.model.updateOne({_id: id}, doc);

                if (status === 'working' && mysteryShopper.status === 'pending') {
                    this.push(mysteryShopper.customer);
                } else if (status === 'finished' && mysteryShopper.status !== 'finished') {
                    await this.broker.emit('mystery:shopper:finished', {
                        placeid: mysteryShopper.place,
                        customerid: mysteryShopper.customer,
                    });
                }

                return {ok: true};

            }
        },
        delete: {
            role: 'customers:write',
            rest: 'DELETE /user/mystery-shopper/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {
                const id = ctx.params.id;
                const mysteryShopper = await this.adapter.model.findOne({_id: id});
                if (!mysteryShopper) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }
                await this.adapter.model.deleteOne({_id: id});
            }
        },
        // Customer
        check: {
            rest: 'GET /customer/mystery-shopper/:id',
            cache: false,
            params: {
                id: 'objectID',
            },
            async handler(ctx) {
                const enabled = _.get(this.broker.metadata, 'mysteryShopper.enabled', false);
                if (!enabled) {
                    throw new MoleculerServerError(ctx.meta.__('function-disabled'), 404);
                }
                const id = ctx.params.id;
                const mysteryShopper = await this.adapter.model.findOne({customer: id});
                const result = {};
                if (mysteryShopper) {
                    result.status = mysteryShopper.status;
                    if (mysteryShopper.status === 'working') {
                        const checklistid = _.get(this.broker.metadata, 'mysteryShopper.checklist');
                        const checklist = await ctx.call('v1.checklists.findOne', {query: {_id: checklistid}, fields: '_id name description items'});
                        if (!checklist) {
                            throw new MoleculerServerError(ctx.meta.__('checklist-not-found'), 404);
                        }
                        result.placeid = mysteryShopper.place;
                        result.checklist = checklist.toJSON();
                    } else {
                        throw new MoleculerServerError(ctx.meta.__(`mystery-shopper-${mysteryShopper.status}`));
                    }
                    // 'verifying', 'rejected', 'finished'
                } else {
                    result.status = 'missing';
                    result.title = _.get(this.broker.metadata, 'mysteryShopper.title');
                    result.description = _.get(this.broker.metadata, 'mysteryShopper.description');
                }
                return result;
            },
        },
        request: {
            rest: 'POST /customer/mystery-shopper',
            cache: false,
            params: {
                placeid: 'objectID',
                customerid: 'objectID',
                message: {
                    type: 'string',
                    optional: true,
                },
            },
            async handler(ctx) {

                const customerid = ctx.params.customerid;
                const placeid = ctx.params.placeid;
                const message = _.trim(ctx.params.message);

                const customer = await ctx.call('v1.customers.findOne', {query: {_id: customerid}});
                if (!customer) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }

                const place = await ctx.call('v1.places.findOne', {query: {_id: placeid}});
                if (!place) {
                    throw new MoleculerServerError(ctx.meta.__('place-not-found'), 404);
                }

                const doc = {};
                doc.place = place._id;
                doc.customer = customer._id;
                doc.status = 'pending';
                if (message) {
                    doc.message = message;
                }

                await this.adapter.model.create(doc).catch(() => {
                    throw new MoleculerServerError(ctx.meta.__('customer-exists'));
                });

                await this.broker.emit('mystery-shopper:created', {customer, place, message});

                return {ok: true};

            },
        },
    },
    methods: {
        async push(customerid) {
            const i18n = this.broker.metadata.i18n;
            await this.broker.call('v1.notifications.push', {
                customerid,
                title: i18n.__('mystery-shopper-title'),
                message: i18n.__('mystery-shopper-message'),
            });
        },
    },
};
