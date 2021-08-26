const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const CustomerGiftModel = require('../models/customer-gift.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {isTest} = require('../helpers/test');
const {MoleculerServerError} = require('moleculer').Errors;
const AuthorizeMixin = require('../mixins/authorize.mixin');

module.exports = {
    name: 'customer-gifts',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: CustomerGiftModel,
    hooks: {
        before: {
            '*': 'hasAccess',
        }
    },
    settings: {
        rest: '/v1',
    },
    events: {
        'order:updated': {
            async handler(ctx) {

                const order = ctx.params.order;
                const customerid = order.customer;

                if (order.status !== 'finished') return;

                const gifts = await ctx.call('v1.gifts.find');

                if (_.size(gifts) === 0) return;

                let giftid;

                _.each(order.items, item => {
                    if (item.gift) {
                        giftid = item.gift.toString();
                        return false;
                    }
                });

                if (giftid) {

                    await this.adapter.model.updateOne(
                        {customer: customerid, gift: giftid},
                        {count: 0},
                    );

                } else {

                    const giftMap = {};
                    const products = {};
                    _.each(gifts, gift => {
                        giftMap[gift._id.toString()] = gift;
                        _.each(gift.products, product => {
                            products[product.toString()] = gift._id.toString();
                        });
                    });

                    let count = 0;
                    _.each(order.items, item => {
                        if (!item.season && !item.gift && products[item.product.toString()]) {
                            giftid = products[item.product.toString()];
                            count++;
                        }
                    });

                    if (count > 0) {

                        await this.adapter.model.updateOne(
                            {customer: customerid, gift: giftid},
                            {customer: customerid, gift: giftid, $inc: {count: 1}},
                            {upsert: true},
                        );

                        await ctx.call('v1.notifications.push', {
                            customerid,
                            giftid,
                            title: giftMap[giftid].name,
                            message: giftMap[giftid].message,
                        });

                    }

                }

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
            cache: false,
            role: 'marketing:read',
            rest: 'GET /user/customer-gifts/:giftid',
            params: {
                giftid: 'objectID',
            },
            async handler(ctx) {
                const purchases = [];
                const items = await this.adapter.model.find({gift: ctx.params.giftid})
                    .populate({path: 'customer', select: 'id name phone email'})
                    .sort('-created')
                    .limit(1000)
                    .exec();
                _.each(items, item => {
                    purchases.push({
                        id: item.id,
                        customer: item.customer,
                        count: item.count,
                    });
                });
                return purchases;
            },
        },
        item: {
            role: 'marketing:read',
            rest: 'GET /user/customer-gift/:id',
            cache: false,
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const result = {};

                if (id === 'new') {
                    return result;
                }

                const customerGift = await this.adapter.model.findOne({_id: id})
                    .populate({path: 'customer', select: 'id name phone email'})
                    .exec();
                if (!customerGift) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }

                result.customerGift = customerGift.toJSON();

                return result;

            }
        },
        add: {
            role: 'marketing:write',
            rest: 'POST /user/customer-gift',
            cache: false,
            async handler(ctx) {

                const login = _.trim(_.toLower(ctx.params.login));
                const giftid = ctx.params.giftid;
                const count = ctx.params.count;

                const customer = await ctx.call('v1.customers.findOne', {query: {$or: [{phone: login}, {email: login}]}});
                if (!customer) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }

                const doc = {};
                doc.customer = customer._id;
                doc.gift = giftid;
                doc.count = count;

                await this.adapter.model.create(doc).catch(() => {
                    throw new MoleculerServerError(ctx.meta.__('purchase-exists'));
                });

                return {ok: true};

            }
        },
        edit: {
            role: 'marketing:write',
            rest: 'PATCH /user/customer-gift',
            cache: false,
            async handler(ctx) {

                const id = ctx.params.id;
                const count = ctx.params.count;

                const customerGift = await this.adapter.model.findOne({_id: id});
                if (!customerGift) {
                    throw new MoleculerServerError(ctx.meta.__('gift-not-found'), 404);
                }

                const doc = {};
                doc.count = count;

                await this.adapter.model.updateOne({_id: id}, doc).catch(() => {
                    throw new MoleculerServerError(ctx.meta.__('purchase-exists'));
                });

                return {ok: true};

            }
        },
        delete: {
            role: 'marketing:write',
            rest: 'DELETE /user/customer-gift/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const gift = await this.adapter.model.findOne({_id: id});
                if (!gift) {
                    throw new MoleculerServerError(ctx.meta.__('gift-not-found'), 404);
                }

                await this.adapter.model.deleteOne({_id: id});

            }
        },
        // Customer
        count: {
            rest: 'GET /customer/count/:customerid/:giftid',
            cache: false,
            params: {
                customerid: 'objectID',
                giftid: 'objectID',
            },
            async handler(ctx) {
                const gift = await this.adapter.model.findOne({
                    customer: ctx.params.customerid,
                    gift: ctx.params.giftid,
                });
                return {count: _.get(gift, 'count', 0)};
            },
        },
        counts: {
            rest: 'GET /customer/counts/:customerid',
            cache: false,
            params: {
                customerid: 'objectID',
            },
            async handler(ctx) {
                const items = await this.adapter.model.find({customer: ctx.params.customerid});
                const counts = {};
                _.each(items, item => {
                    if (item.count > 0) counts[item.gift.toString()] = item.count;
                });
                return counts;
            },
        },
        charge: {
            role: 'orders:write',
            rest: 'POST /user/gift/charge',
            params: {
                code: {
                    type: 'string',
                    length: 4,
                },
                giftid: {
                    type: 'objectID',
                    optional: true,
                },
            },
            async handler(ctx) {

                const code = ctx.params.code;
                const giftid = ctx.params.giftid;

                const key = `code:${code}`;

                const data = await this.broker.cacher.client.hgetall(key);
                if (_.size(data) === 0) {
                    throw new MoleculerServerError(ctx.meta.__('code-not-found'), 404);
                }

                const customer = await ctx.call('v1.customers.get', {id: data.id, fields: '_id name'});
                if (!customer) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }

                const query = {};
                if (giftid) {
                    query._id = giftid;
                }
                const gift = await ctx.call('v1.gifts.findOne', {query});
                if (!gift) {
                    throw new MoleculerServerError(ctx.meta.__('gift-not-found'), 404);
                }

                const customerGift = await this.adapter.model.findOne({customer: customer._id, gift: gift._id});
                const updated = _.get(customerGift, 'updated');
                if (updated) {
                    const minutes = Math.floor((new Date().getTime() - updated.getTime()) / 60000);
                    const interval = _.get(this.broker.metadata, 'qrcode.interval', 60);
                    if (minutes < interval) {
                        throw new MoleculerServerError(ctx.meta.__('gift-try-later'));
                    }
                }

                await this.adapter.model.updateOne(
                    {customer: customer._id, gift: gift._id},
                    {customer: customer._id, gift: gift._id, $inc: {count: 1}},
                    {upsert: true},
                );

                await ctx.call('v1.notifications.push', {
                    customerid: customer._id,
                    giftid: gift._id,
                    title: gift.name,
                    message: gift.description,
                });

                if (!isTest()) {
                    await this.broker.cacher.client.del(key);
                }

                return {message: `${ctx.meta.__('gift-added-for')}: ${_.get(customer, 'name', ctx.meta.__('customer'))}`};

            }
        },
    },
};
