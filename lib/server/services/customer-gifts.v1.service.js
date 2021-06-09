const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const CustomerGiftModel = require('../models/customer-gift.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;

module.exports = {
    name: 'customer-gifts',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: CustomerGiftModel,
    events: {
        'order:updated': {
            async handler(ctx) {

                const order = ctx.params;
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
                let count = 0;

                _.each(order.items, item => {
                    if (!item.season && products[item.product.toString()]) {
                        giftid = products[item.product.toString()];
                        count++;
                    } else if (item.gift) {
                        giftid = item.gift.toString();
                    }
                });

                if (count > 0) {
                    await ctx.call('v1.customer-gifts.updateOne', {
                        filter: {customer: customerid, gift: giftid},
                        doc: {customer: customerid, gift: giftid, $inc: {count}},
                        options: {upsert: true},
                    });
                    await ctx.call('v1.push-notifications.add', {
                        customerid,
                        giftid,
                        title: gifts[giftid].name,
                        message: gifts[giftid].message,
                    });
                } else if (giftid) {
                    await ctx.call('v1.customer-gifts.deleteOne', {conditions: {customer: customerid, gift: giftid}});
                }

            }
        },
    },
    actions: {
        get: {
            cache: false,
        },
        find: {
            cache: false,
        },
        // v1.customer-gifts.count
        count: {
            cache: false,
            params: {
                customerid: 'objectID',
                giftid: 'objectID',
            },
            async handler(ctx) {
                const gift = await ctx.call('v1.customer-gifts.findOne', {conditions: {customer: ctx.params.customerid, gift: ctx.params.giftid}});
                return {count: _.get(gift, 'count', 0)};
            },
        },
        // v1.customer-gifts.charge
        charge: {
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

                await ctx.call('v1.customer-gifts.updateOne', {
                    filter: {customer: customer._id, gift: gift._id},
                    doc: {customer: customer._id, gift: gift._id, $inc: {count: 1}},
                    options: {upsert: true},
                });

                await ctx.call('v1.push-notifications.add', {
                    customerid: customer._id,
                    giftid: gift._id,
                    title: gift.name,
                    message: gift.description,
                });

                await this.broker.cacher.client.del(key);

                return {message: `${ctx.meta.__('gift-added-for')}: ${_.get(customer, 'name', ctx.meta.__('customer'))}`};

            }
        },
    },
};
