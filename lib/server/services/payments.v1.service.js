const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const PaymentModel = require('../models/payment.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;
const moment = require('moment');
const {isTest} = require('../helpers/test');

module.exports = {
    name: 'payments',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: PaymentModel,
    settings: {
        rest: '/v1',
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
        // v1.payments.pay
        pay: {
            rest: 'POST /customer/pay',
            cache: false,
            params: {
                methodid: 'objectID',
                customerid: 'objectID',
                placeid: {
                    type: 'objectID',
                    optional: true,
                },
                objectid: {
                    type: 'objectID',
                    optional: true,
                },
                cause: {
                    type: 'enum',
                    values: ['balance', 'order', 'season'],
                },
                from: {
                    type: 'enum',
                    values: ['app', 'site'],
                },
                amount: {
                    type: 'number',
                    convert: true,
                },
                token: {
                    type: 'string',
                    optional: true,
                },
            },
            async handler(ctx) {

                const customerid = ctx.params.customerid;
                const methodid = ctx.params.methodid;
                const placeid = ctx.params.placeid;
                const objectid = ctx.params.objectid;
                const amount = ctx.params.amount;
                const cause = ctx.params.cause;
                const from = ctx.params.from;

                const paymentMethod = await ctx.call('v1.payment-methods.findOne', {query: {_id: methodid}});
                if (!paymentMethod) {
                    throw new MoleculerServerError(ctx.meta.__('payment-method-not-found'), 404);
                }

                const set = {};
                set.cause = cause;
                set.amount = amount;
                set.from = from;
                set.customer = customerid;
                set.object = objectid;
                set.paymentMethod = methodid;
                if (placeid) {
                    set.place = placeid;
                }

                const payment = await ctx.call('v1.payments.create', set);

                await this.broker.emit('payment:created', {paymentMethod});

                if (paymentMethod.type === 'apple') {

                    const params = _.cloneDeep(paymentMethod.params);
                    params.paymentid = payment._id;
                    params.token = ctx.params.token;

                    const {apple} = require(`../gateways/alfabank`);

                    const result = await apple(params);

                    await ctx.call('v1.payments.updateOne', {filter: {_id: payment._id}, doc: {response: result.response}});

                    if (result.success) {
                        await this.success(payment._id);
                    }

                    return result;

                } else if (paymentMethod.type === 'google') {

                    const params = _.cloneDeep(paymentMethod.params);
                    params.paymentid = payment._id;
                    params.amount = amount;
                    params.token = ctx.params.token;
                    params.ip = ctx.params.ip;
                    params.url = ctx.meta.url;

                    const {google} = require(`../gateways/alfabank`);

                    const result = await google(params);

                    await ctx.call('v1.payments.updateOne', {filter: {_id: payment._id}, doc: {response: result.response}});

                    if (result.success) {
                        await this.success(payment._id);
                    }

                    return result;

                } else if (paymentMethod.type === 'balance') {

                    const customer = await this.broker.call('v1.customers.findOne', {query: {_id: customerid}});
                    if (!customer) {
                        throw new MoleculerServerError(ctx.meta.__('customer-not-found'));
                    }

                    if (customer.balance < amount) {
                        throw new MoleculerServerError(ctx.meta.__('not-enough-money'));
                    }

                    await this.broker.call('v1.customer-balances.create', {customer: customerid, amount: -amount});
                    await ctx.call('v1.customers.updateOne', {
                        filter: {_id: customerid},
                        doc: {$inc: {balance: -amount}}
                    });
                    await this.broker.call('v1.io.emit', {
                        room: `customer-${customerid}`,
                        event: 'balance',
                        data: {balance: customer.balance - amount}
                    });

                    await this.success(payment._id);

                    return {success: true};

                } else if (paymentMethod.type === 'bonuses') {

                    const customer = await this.broker.call('v1.customers.findOne', {query: {_id: customerid}});
                    if (!customer) {
                        throw new MoleculerServerError(ctx.meta.__('customer-not-found'));
                    }

                    if (customer.bonuses < amount) {
                        throw new MoleculerServerError(ctx.meta.__('not-enough-bonuses'));
                    }

                    await this.broker.call('v1.customer-bonuses.create', {customer: customerid, amount: -amount});
                    await ctx.call('v1.customers.updateOne', {
                        filter: {_id: customerid},
                        doc: {$inc: {bonuses: -amount}}
                    });
                    await this.broker.call('v1.io.emit', {
                        room: `customer-${customerid}`,
                        event: 'bonuses',
                        data: {bonuses: customer.bonuses - amount}
                    });

                    await this.success(payment._id);

                    return {success: true};

                } else {

                    const params = _.cloneDeep(paymentMethod.params);
                    params.paymentid = payment._id;
                    params.amount = amount;
                    params.url = ctx.meta.url;

                    const {card} = require(`../gateways/alfabank`);

                    const result = await card(params);

                    await ctx.call('v1.payments.updateOne', {filter: {_id: payment._id}, doc: {response: result.response}});

                    return result;

                }

            }
        },
        // v1.payments.success
        success: {
            rest: 'GET /customer/pay/success/:paymentid',
            cache: false,
            params: {
                paymentid: 'objectID',
            },
            async handler(ctx) {
                const payment = await this.success(ctx.params.paymentid);
                if (payment.from === 'site') {
                    return {redirect: `${ctx.meta.url}#success-payment`};
                } else {
                    return '<p></p>';
                }
            }
        },
        // v1.payments.fail
        fail: {
            rest: 'GET /customer/pay/fail/:paymentid',
            cache: false,
            params: {
                paymentid: 'objectID',
            },
            async handler(ctx) {
                const payment = await this.fail(ctx.params.paymentid);
                if (payment.from === 'site') {
                    return {redirect: `${ctx.meta.url}#fail-payment`};
                } else {
                    return '<p></p>';
                }
            }
        },
    },
    methods: {
        async success(paymentid) {
            const payment = await this.broker.call('v1.payments.findOne', {query: {_id: paymentid}});
            if (_.get(payment, 'status') === 'pending' || isTest()) {
                await this.broker.call('v1.payments.updateOne', {filter: {_id: payment._id}, doc: {status: 'success'}});
                switch (payment.cause) {
                    case 'balance':
                        await this.balance(payment);
                        break;
                    case 'order':
                        await this.order(payment);
                        break;
                    case 'season':
                        await this.season(payment);
                        break;
                }
            }
            return payment;
        },
        async balance(payment) {
            const customerid = payment.object;
            const customer = await this.broker.call('v1.customers.findOneAndUpdate', {
                query: {_id: customerid},
                update: {$inc: {balance: payment.amount}},
                options: {upsert: false, new: true},
            });
            await this.broker.call('v1.customer-balances.create', {customer: customerid, amount: payment.amount});
            await this.broker.call('v1.io.emit', {room: `customer-${customerid}`, event: 'balance', data: {balance: customer.balance}});
        },
        async order(payment) {
            const orderid = payment.object;
            const order = await this.broker.call('v1.orders.findOneAndUpdate', {
                query: {_id: orderid},
                update: {status: 'new'},
                options: {new: true}
            });
            await this.broker.emit('order:created', {order});
        },
        async season(payment) {

            const customerid = payment.customer;
            const seasonid = payment.object;
            const placeid = payment.place;

            const season = await this.broker.call('v1.seasons.findOne', {query: {_id: seasonid}});

            if (season) {

                await this.broker.call('v1.customer-seasons.findOneAndUpdate', {
                    query: {customer: customerid, place: placeid},
                    update: {
                        customer: customerid,
                        place: placeid,
                        season: seasonid,
                        date: moment().add(season.duration, 'days'),
                    },
                    options: {upsert: true, new: true},
                });

                const seasons = await this.broker.call('v1.customer-seasons.customer', {customerid, placeid});
                await this.broker.call('v1.io.emit', {
                    room: `customer-${customerid}`,
                    event: 'seasons',
                    data: {seasons}
                });
                await this.broker.emit('season:purchased', {season});

            }
        },
        async fail(paymentid) {
            await this.broker.call('v1.payments.updateOne', {filter: {_id: paymentid}, doc: {status: 'fail'}});
            return await this.broker.call('v1.payments.findOne', {query: {_id: paymentid}});
        },
    },
};
