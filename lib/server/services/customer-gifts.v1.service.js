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

                const gifts = {};
                const _gifts = await ctx.call('v1.gifts.find');

                if (_.size(_gifts) === 0) return;

                const products = {};
                _.each(_gifts, gift => {
                    gifts[gift._id.toString()] = gift;
                    _.each(gift.products, product => {
                        products[product.toString()] = gift._id.toString();
                    });
                });

                let giftid;

                _.each(order.items, item => {
                    if (item.gift) {
                        giftid = item.gift.toString();
                        return false;
                    }
                });

                if (giftid) {
                    await ctx.call('v1.customer-gifts.deleteOne', {conditions: {customer: customerid, gift: giftid}});
                    return;
                }

                let count = 0;
                _.each(order.items, item => {
                    if (!item.season && !item.gift && products[item.product.toString()]) {
                        giftid = products[item.product.toString()];
                        count++;
                    }
                });
                if (count > 0) {
                    await ctx.call('v1.customer-gifts.updateOne', {
                        filter: {customer: customerid, gift: giftid},
                        doc: {customer: customerid, gift: giftid, $inc: 1},
                        options: {upsert: true},
                    });
                    await ctx.call('v1.notifications.push', {
                        customerid,
                        giftid,
                        title: gifts[giftid].name,
                        message: gifts[giftid].message,
                    });
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
        // v1.customer-gifts.count
        count: {
            rest: 'GET /customer/count/:customerid/:giftid',
            cache: false,
            params: {
                customerid: 'objectID',
                giftid: 'objectID',
            },
            async handler(ctx) {
                const gift = await ctx.call('v1.customer-gifts.findOne', {
                    conditions: {
                        customer: ctx.params.customerid,
                        gift: ctx.params.giftid
                    }
                });
                return {count: _.get(gift, 'count', 0)};
            },
        },
        // v1.customer-gifts.charge
        charge: {
            role: 'orders:write',
            rest: 'POST /user/gift/charge',
            params: {
                code: {
                    type: 'string',
                    length: 4,
                }
            },
            async handler(ctx) {

                const code = ctx.params.code;

                const key = `code:${code}`;

                const data = await this.broker.cacher.client.hgetall(key);
                if (_.size(data) === 0) {
                    throw new MoleculerServerError(ctx.meta.__('code-not-found'), 404);
                }

                const customer = await ctx.call('v1.customers.get', {id: data.id, fields: '_id name'});
                if (!customer) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }

                const gifts = await ctx.call('v1.gifts.find');
                if (_.size(gifts) === 0) {
                    throw new MoleculerServerError(ctx.meta.__('gift-not-found'), 404);
                }
                const gift = gifts[0];

                const customerGift = await this.adapter.model.findOne({customer: customer._id, gift: gift._id});
                if (customerGift) {
                    const minutes = Math.floor((new Date().getTime() - customerGift.updated.getTime()) / 60000);
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
