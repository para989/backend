const _ = require('lodash');
const xl = require('excel4node');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const OrderModel = require('../models/order.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const mongoose = require('mongoose');
const {MoleculerServerError} = require('moleculer').Errors;
const {orderNumber, orderCard} = require('../helpers/order');
const {cleanPhone} = require('../helpers/phone');
const {cost} = require('../helpers/cost');
const moment = require('moment-timezone');
const {placeCard} = require("../helpers/place");
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const dir = path.join(os.tmpdir(), 'reports');
const uniqid = require('uniqid');
const {isTest} = require("../helpers/test");

module.exports = {
    name: 'orders',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: OrderModel,
    settings: {
        rest: '/v1',
    },
    created() {
        fs.ensureDirSync(dir);
    },
    events: {
        'order:created': {
            async handler(ctx) {

                const order = ctx.params;
                const i18n = this.broker.metadata.i18n;
                const number = orderNumber(order.number);

                ctx.call('v1.io.emit', {
                    room: order.place ? `place-${order.place}` : undefined,
                    event: 'order',
                    data: orderCard(order)
                });

                await ctx.call('v1.push-notifications.add', {
                    placeid: order.place.toString(),
                    orderid: order._id.toString(),
                    title: i18n.__('new-order-title'),
                    message: i18n.__('new-order-message', number),
                });

            }
        },
        'order:updated': {
            async handler(ctx) {

                const order = ctx.params;
                const i18n = this.broker.metadata.i18n;
                const number = orderNumber(order.number);

                ctx.call('v1.io.emit', {
                    room: order.place ? `place-${order.place}` : undefined,
                    event: 'order',
                    data: orderCard(order)
                });

                if (order.status === 'new') {
                    await ctx.call('v1.push-notifications.add', {
                        placeid: order.place.toString(),
                        orderid: order._id.toString(),
                        title: i18n.__('new-order-title'),
                        message: i18n.__('new-order-message', number),
                    });
                }

                if (order.status === 'finished') {

                    const place = await ctx.call('v1.places.get', {id: order.place.toString(), fields: 'street house'});

                    let message = i18n.__('order-finished-message', number);
                    if (place) {
                        message += i18n.__('order-finished-address', place.street, place.house);
                    }

                    await ctx.call('v1.push-notifications.add', {
                        customerid: order.customer.toString(),
                        orderid: order._id.toString(),
                        title: i18n.__('order-finished-title'),
                        message,
                    });

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
        // v1.orders.items
        items: {
            cache: false,
            params: {
                status: {
                    type: 'string',
                    enum: ['current', 'processed', 'delivered', 'completed', 'unpaid'],
                    default: 'current',
                },
                page: {
                    type: 'number',
                    positive: true,
                    convert: true,
                    default: 1,
                    optional: true,
                },
            },
            async handler(ctx) {

                const status = ctx.params.status;
                const text = ctx.params.text;

                let where = {};

                switch (ctx.meta.user.type) {
                    case 'admin':

                        break;
                    case 'manager':

                        break;
                    case 'operator':

                        break;
                }

                switch (status) {
                    case 'current':
                        where.status = {$in: ['new', 'returned', 'processed']};
                        break;
                    case 'processed':
                        where.status = {$in: ['preparing', 'going']};
                        break;
                    case 'delivered':
                        where.status = 'delivered';
                        break;
                    case 'completed':
                        const date = moment().subtract(30, 'days').toDate();
                        where.status = {$in: ['finished', 'canceled']};
                        where.date = {$gte: date};
                        break;
                    case 'unpaid':
                        where.status = 'unpaid';
                        break;
                }

                const dates = ctx.params.dates;
                if (_.isArray(dates) && _.size(dates)) {
                    _.each(dates, (date, index) => {
                        dates[index] = moment(date);
                    });
                    if (_.size(dates) === 1) {
                        let start = dates[0].toDate();
                        let end = dates[0].add(1, 'd').toDate();
                        where.date = {$gte: start, $lt: end};
                    } else if (_.size(dates)) {
                        let start = dates[0].toDate();
                        let end = dates[1].add(1, 'd').toDate();
                        where.date = {$gte: start, $lt: end};
                    }
                }

                if (text) {
                    if (text.match(/^[0-9a-fA-F]{24}$/)) {
                        where = {_id: text};
                    } else {
                        where['$text'] = {$search: text};
                    }
                }

                const page = ctx.params.page;

                if (_.size(ctx.meta.user.places)) {
                    where.place = {$in: ctx.meta.user.places};
                }

                const orders = await ctx.call('v1.orders.find', {
                    query: where,
                    limit: 100,
                    sort: '-date',
                    offset: page > 1 ? ((page - 1) * 100) : 0,
                });

                const result = [];
                _.each(orders, order => {
                    const push = orderCard(order);
                    push.items = order.items;
                    result.push(push);
                });

                return result;

            }
        },
        // v1.orders.item
        item: {
            cache: false,
            params: {
                orderid: 'objectID',
            },
            async handler(ctx) {

                const orderid = ctx.params.orderid;

                const units = await ctx.call('v1.units.get', {language: ctx.params.lang});

                const result = {
                    minimumOrderAmount: 0,
                    minimumAmountDelivery: 0,
                    costDelivery: 0,
                    obtainings: ['delivery'],
                    addresses: [],
                };

                if (orderid === 'new') {
                    return result;
                }

                const orderItem = await ctx.call('v1.orders.get', {id: orderid});
                if (!orderItem) {
                    throw new MoleculerServerError(ctx.meta.__('order-not-found'), 404);
                }

                result.orderid = orderItem._id.toString();
                result.number = orderItem.number;
                result.status = orderItem.status;
                result.date = orderItem.date;
                result.obtaining = orderItem.obtaining;
                result.paymentMethod = orderItem.paymentMethod;
                result.paymentMethods = {};

                if (orderItem.user) {
                    result.userid = _.toString(orderItem.user);
                }

                result.amount = orderItem.amount;

                result.name = orderItem.name;
                result.email = orderItem.email;
                result.phone = orderItem.phone;

                result.postalcode = orderItem.postalcode;
                result.country = orderItem.country;
                result.city = orderItem.city;
                result.address = orderItem.address;

                const productids = [];
                const modifierids = [];
                _.each(orderItem.order, item => {
                    productids.push(item._id);
                    _.each(item.modifiers, (modifier, modifierid) => {
                        modifierids.push(modifierid);
                    });
                });

                const products = {};
                if (_.size(productids)) {
                    const items = await ctx.call('v1.products.find', {
                        query: {
                            _id: {$in: productids}
                        }, fields: '_id groups name gallery prices url'
                    });
                    _.each(items, item => {
                        products[item._id.toString()] = item;
                    });
                }

                const modifiers = {};
                if (_.size(modifierids)) {
                    const items = await ctx.call('v1.modifiers.find', {
                        query: {
                            _id: {$in: modifierids}
                        }
                    });
                    _.each(items, item => {
                        _.each(item.items, modifierItem => {
                            _.set(modifiers, [item._id.toString(), modifierItem._id.toString()], modifierItem);
                        });
                    });
                }

                result.order = [];
                _.each(orderItem.order, item => {
                    const productid = _.toString(item._id);

                    const product = products[productid];

                    if (product) {

                        const push = {
                            product: {
                                productid: product._id.toString(),
                                name: product.name,
                                description: product.description,
                                picture: product.gallery[0].picture,
                                prices: product.prices,
                                modifiers: _.size(product.modifiers) > 0,
                            },
                            price: this.getPrice(units, product.prices, item.priceid),
                            quantity: item.quantity,
                        };

                        if (_.size(item.modifiers)) {
                            push.modifiers = this.getModifiers(modifiers, item.modifiers);
                        }

                        result.order.push(push);

                    }

                });

                let status;
                switch (orderItem.status) {
                    case 'new':
                    case 'returned':
                        status = 'processed';
                        break;
                    case 'preparing':
                        status = 'going';
                        break;
                }

                if (status) {
                    const user = ctx.meta.user;
                    const update = {status, user: {_id: user.id, name: user.name}};
                    const order = await ctx.call('v1.orders.findOneAndUpdate', {
                        conditions: {_id: orderid},
                        update,
                        options: {new: true}
                    });
                    await this.broker.emit('order:updated', order);
                } else {
                    result.user = orderItem.user;
                }

                return result;

            }
        },
        // v1.orders.filter
        filter: {
            cache: false,
            async handler(ctx) {

                let status = ctx.params.status;
                if (status !== 'current' && status !== 'processed' && status !== 'delivered' && status !== 'completed' && status !== 'unpaid') {
                    return res.sendStatus(404);
                }
                /*let result = {};
                let where = {};
                switch (ctx.user.type) {
                    case 'admin':
                        where = {userid: ctx.user._id};
                        break;
                    case 'manager':
                    case 'operator':
                        where = {userid: ctx.user._id, placeid: {$in: ctx.user.places}};
                        break;
                    default:
                        return res.sendStatus(404);
                }
                switch (status) {
                    case 'current':
                        where.status = {$in: ['new', 'returned', 'processed']};
                        break;
                    case 'processed':
                        where.status = {$in: ['preparing', 'going']};
                        break;
                    case 'delivered':
                        where.status = 'delivered';
                        break;
                    case 'completed':
                        where.status = {$in: ['finished', 'canceled']};
                        break;
                    case 'unpaid':
                        where.status = 'unpaid';
                        break;
                }
                async.waterfall([
                    function (callback) {
                        Orders.findOne(where, 'date', {sort: {date: 1}, lean: true}, callback);
                    },
                    function (data, callback) {
                        result.minDate = data ? data.date : new Date();
                        Orders.findOne(where, 'date', {sort: {date: -1}, lean: true}, callback);
                    },
                    function (data, callback) {
                        result.maxDate = data ? data.date : new Date();
                        let sort = {'order': 1};
                        where = {userid: ctx.user._id};
                        if (ctx.user.type === 'manager' || ctx.user.type === 'operator') {
                            where = {_id: {$in: ctx.user.places}};
                        }
                        Places.find(where, 'name city', {sort: sort, lean: true}, callback);
                    },
                    function (items, callback) {
                        let places = [];
                        _.each(items, item => {
                            let name = item.name ? item.city.name + ': ' + item.name : item.city.name;
                            places.push({placeid: item._id, name: name});
                        });
                        result.places = places;
                        callback(null, true);
                    }
                ], function (err, data) {
                    if (err) {
                        res.sendStatus(423);
                    } else {
                        res.json(result);
                    }
                });*/


                return {};
            }
        },
        // v1.orders.add
        add: {
            async handler(ctx) {

                if (isTest()) {
                    console.log(JSON.stringify(ctx.params));
                }

                const lang = ctx.meta.getLocale();

                const placeid = _.get(ctx.params, 'placeid');
                const from = _.get(ctx.params, 'from', 'site');
                const methodid = _.get(ctx.params, 'methodid');
                const obtaining = _.get(ctx.params, 'obtaining', 'delivery');
                const customerid = _.get(ctx.params, 'customerid');
                const promocodeid = _.get(ctx.params, 'promocodeid');
                const items = _.get(ctx.params, 'items');
                const wishes = isTest() ? ctx.meta.__('test-order') : _.trim(_.get(ctx.params, 'wishes'));

                const method = await ctx.call('v1.payment-methods.findOne', {conditions: {_id: methodid}});
                if (!method) {
                    throw new MoleculerServerError(ctx.meta.__('payment-method-not-found'), 404);
                }

                let status = _.get(ctx.params, 'status', 'new');
                if (!_.includes(['cash', 'terminal'], method.type)) {
                    status = 'unpaid';
                }

                const customer = await ctx.call('v1.customers.get', {id: customerid});
                const name = _.trim(_.get(ctx.params, 'name', _.get(customer, 'name', ctx.meta.__('customer'))));
                const email = _.trim(_.toLower(_.get(ctx.params, 'email', _.get(customer, 'email'))));
                const phone = cleanPhone(_.get(ctx.params, 'phone', _.get(customer, 'phone')));

                const data = {
                    from,
                    paymentMethod: methodid,
                    status,
                    name,
                    email,
                    phone,
                    obtaining,
                };

                if (placeid) {
                    data.place = placeid;
                }

                if (wishes) {
                    data.wishes = wishes;
                }

                if (customer) {
                    data['customer'] = customer._id;
                }

                if (promocodeid) {
                    data['promocode'] = promocodeid;
                }

                // проверяем заказ на уникальность
                /*if (!isTest()) {
                    const string = JSON.stringify(ctx.params);
                    const hash = md5.update(string);
                    const uniqueness = await ctx.call('v1.uniqueness.findOne', {conditions: {hash}});
                    if (uniqueness) {
                        ctx.meta.$statusCode = 208;
                        return {};
                    } else {
                        await ctx.call('v1.uniqueness.create', {string, hash});
                    }
                }*/

                // создаем номер заказа
                const counter = await ctx.call('v1.counters.findOneAndUpdate', {
                    conditions: {
                        place: placeid,
                        year: new Date().getFullYear(),
                        month: new Date().getMonth(),
                    },
                    update: {
                        $inc: {counter: 1},
                    },
                    options: {
                        upsert: true,
                        new: true,
                    },
                });
                data.number = counter.counter;

                // собираем заказ
                const orderData = await this.toDB(methodid, _.cloneDeep(items), lang);
                if (_.size(orderData.items)) {
                    data.items = orderData.items;
                    data.amount = orderData.amount;
                    data.discount = orderData.discount;
                } else {
                    throw new MoleculerServerError(ctx.meta.__('something-went-wrong'));
                }

                const order = await this.adapter.model.create(data);
                if (status === 'new') {
                    await this.broker.emit('order:created', order);
                } else {
                    await this.broker.emit('order:updated', order);
                }

                return {
                    orderid: order._id,
                    number: orderNumber(data.number),
                    status,
                    amount: orderData.amount,
                }

            }
        },
        // v1.orders.edit
        edit: {
            async handler(ctx) {

                // this.logger.error(ctx.params);

                const orderid = ctx.params.orderid;
                const obtaining = _.get(ctx.params, 'obtaining', 'delivery');
                const status = _.get(ctx.params, 'status', 'preparing');

                const name = _.trim(ctx.params.name);
                const email = _.trim(_.toLower(ctx.params.email));
                const phone = cleanPhone(ctx.params.phone);

                const postalcode = _.trim(ctx.params.postalcode);
                const country = _.trim(ctx.params.country);
                const city = _.trim(ctx.params.city);
                const address = _.trim(ctx.params.address);
                const items = _.get(ctx.params, 'items');

                const data = {
                    // paymentMethod: methodid,
                    status,
                    name,
                    email,
                    phone,
                    postalcode,
                    country,
                    city,
                    address,
                    obtaining,
                };

                // собираем заказ
                const orderData = await this.toDB(ctx.params.methodid, _.cloneDeep(items));
                if (_.size(orderData.items)) {
                    data.items = orderData.items;
                    data.amount = orderData.amount;
                    data.discount = orderData.discount;
                } else {
                    throw new MoleculerServerError(ctx.meta.__('something-went-wrong'));
                }

                const newOrder = await ctx.call('v1.orders.findOneAndUpdate', {
                    conditions: {_id: orderid},
                    update: {
                        $set: data,
                        $unset: {user: ''},
                    },
                    options: {new: true},
                });

                await this.broker.emit('order:updated', newOrder);

            }
        },
        // v1.orders.status
        status: {
            params: {
                orderid: 'objectID',
                status: 'string',
            },
            async handler(ctx) {

                const orderid = ctx.params.orderid;
                const status = ctx.params.status;

                const update = {};
                update.$set = {status};
                update.$unset = {user: ''};
                const order = await ctx.call('v1.orders.findOneAndUpdate', {
                    conditions: {_id: orderid},
                    update,
                    options: {new: true}
                });
                await this.broker.emit('order:updated', order);

                if (status === 'finished') {
                    const items = order.items;
                    const progress = _.size(order.items);
                    _.each(items, item => {
                        item.ready = true;
                    });
                    const doc = {items, progress};
                    await ctx.call('v1.orders.updateOne', {filter: {_id: orderid}, doc});
                }

                return {ok: true};

            }
        },
        // v1.orders.setProgress
        setProgress: {
            params: {
                orderIndex: {
                    type: 'number',
                    min: 0,
                    integer: true,
                    convert: true,
                },
                itemIndex: {
                    type: 'number',
                    min: 0,
                    integer: true,
                    convert: true,
                },
            },
            async handler(ctx) {

                const orderIndex = ctx.params.orderIndex;
                const itemIndex = ctx.params.itemIndex;

                const oldOrder = await ctx.call('v1.orders.findOne', {conditions: {index: orderIndex}});
                if (!oldOrder) {
                    throw new MoleculerServerError(ctx.meta.__('order-not-found'), 404);
                }

                let items = oldOrder.items;
                let status = oldOrder.status;

                if (!items[itemIndex]) {
                    throw new MoleculerServerError(ctx.meta.__('order-not-found'), 404);
                }

                items[itemIndex].ready = true;
                let progress = 0;
                _.each(items, item => {
                    if (item.ready) {
                        progress++;
                    }
                });

                if (status === 'new') {
                    status = 'processed';
                }

                if (progress === _.size(items)) {
                    status = 'finished';
                }

                const update = {status, items, progress};
                const newOrder = await ctx.call('v1.orders.findOneAndUpdate', {
                    conditions: {_id: oldOrder._id},
                    update,
                    options: {new: true}
                });
                await this.broker.emit('order:updated', newOrder);

                return {ok: true};

            }
        },
        // v1.orders.revokeProgress
        revokeProgress: {
            params: {
                orderid: 'objectID',
                index: {
                    type: 'number',
                    min: 0,
                    integer: true,
                    convert: true,
                },
            },
            async handler(ctx) {

                const orderid = ctx.params.orderid;
                const index = ctx.params.index;

                const oldOrder = await ctx.call('v1.orders.get', {id: orderid, fields: 'status items'});
                if (!oldOrder) {
                    throw new MoleculerServerError(ctx.meta.__('order-not-found'), 404);
                }

                let items = oldOrder.items;
                let status = oldOrder.status;

                if (!items[index]) {
                    throw new MoleculerServerError(ctx.meta.__('order-not-found'), 404);
                }

                items[index].ready = false;
                let progress = 0;
                _.each(items, item => {
                    if (item.ready) {
                        progress++;
                    }
                });

                if (status === 'finished') {
                    status = 'processed';
                }

                const update = {status, items, progress};
                const newOrder = await ctx.call('v1.orders.findOneAndUpdate', {
                    conditions: {_id: orderid},
                    update,
                    options: {new: true}
                });
                await this.broker.emit('order:updated', newOrder);

                return {ok: true};

            }
        },
        // v1.orders.products
        products: {
            async handler(ctx) {

                const result = [];

                const products = await ctx.call('v1.products.find', {
                    fields: '_id name description gallery prices modifiers',
                    sort: 'order'
                });
                _.each(products, product => {
                    result.push({
                        productid: product._id.toString(),
                        name: product.name,
                        description: product.description,
                        picture: product.gallery[0].picture,
                        prices: product.prices,
                        modifiers: _.size(product.modifiers) > 0,
                    });
                });

                return result;

            }
        },
        // v1.orders.product
        product: {
            params: {
                productid: 'objectID',
            },
            async handler(ctx) {

                const product = await ctx.call('v1.products.get', {id: ctx.params.productid});

                if (!product) {
                    throw new MoleculerServerError(ctx.meta.__('product-not-found'), 404);
                }

                const result = {};
                result.productid = product._id.toString();
                result.picture = product.gallery[0].picture;
                result.name = product.name;
                result.description = product.description;
                result.modifiers = product.modifiers;
                result.prices = product.prices;

                if (_.size(product.modifiers)) {

                    const modifiers = await ctx.call('v1.modifiers.find', {
                        query: {_id: {$in: product.modifiers}},
                        sort: 'order'
                    });

                    result.modifiers = [];

                    _.each(modifiers, modifier => {

                        const maximum = modifier.type === 'many' ? modifier.maximum : 1;

                        const push = {
                            modifierid: modifier._id.toString(),
                            name: modifier.name,
                            required: modifier.required,
                            type: modifier.type,
                            items: [],
                            maximum: maximum
                        };

                        _.each(modifier.items, item => {

                            push.items.push({
                                itemid: item._id,
                                name: item.name,
                                price: item.price,
                                value: item.value,
                                type: item.type,
                            });

                        });

                        if (_.size(push.items)) {
                            result.modifiers.push(push);
                        }

                    });

                }

                return result;

            },
        },
        // v1.orders.orders
        orders: {
            params: {
                customerid: 'objectID',
            },
            async handler(ctx) {

                const customerid = ctx.params.customerid;

                const orders = await ctx.call('v1.orders.find', {
                    query: {customer: customerid},
                    limit: 100,
                    sort: '-date',
                });

                const result = [];
                _.each(orders, order => {

                    const items = [];

                    _.each(order.items, item => {
                        const push = {
                            id: item.product,
                            quantity: item.quantity,
                            price: item.price,
                            name: item.name,
                            picture: item.picture,
                            amount: item.amount,
                            modifiers: [],
                        };
                        if (_.size(item.modifiers)) {
                            push.modifiers = [];
                            _.each(item.modifiers, modifier => {
                                push.modifiers.push({
                                    id: modifier.modifier,
                                    quantity: modifier.quantity,
                                    name: item.name,
                                    picture: item.picture,
                                    amount: item.amount,
                                });
                            });
                        }
                        items.push(push);
                    })

                    result.push({
                        id: order._id,
                        date: order.date,
                        amount: order.amount,
                        paid: order.status !== 'unpaid',
                        items: items,
                    });

                });

                return result;

            },
        },
        // v1.orders.createReport
        createReport: {
            params: {
                dates: {
                    type: 'array',
                    optional: true,
                },
                placeids: {
                    type: 'array',
                    optional: true,
                },
                save: {
                    type: 'boolean',
                    default: false,
                },
            },
            async handler(ctx) {

                const save = ctx.params.save;

                const where = {status: {$ne: 'unpaid'}};

                const dates = ctx.params.dates;
                if (_.size(dates) === 2) {
                    where.date = {$gt: dates[0], $lt: dates[1]};
                }

                if (_.size(ctx.params.placeids)) {
                    where.place = {$in: ctx.params.placeids};
                }

                const orders = await ctx.call('v1.orders.find', {
                    query: where,
                    limit: 1000,
                    sort: 'date',
                });

                const dateFormat = ctx.meta.__('date-format');

                const result = {
                    places: [],
                    minDate: new Date(),
                    maxDate: new Date(),
                    items: [],
                    amount: 0,
                    discount: 0
                };

                const _places = await ctx.call('v1.places.find');
                const places = {};
                _.each(_places, _place => {
                    const place = placeCard(_place);
                    places[_place._id.toString()] = place.address;
                    result.places.push(place);
                });

                if (_.size(orders)) {

                    const oldestOrder = await ctx.call('v1.orders.find', {limit: 1, sort: 'date', fields: 'date'});
                    const oldestDate = _.get(oldestOrder, '0.date', new Date());
                    const newestOrder = await ctx.call('v1.orders.find', {limit: 1, sort: '-date', fields: 'date'});
                    const newestDate = _.get(newestOrder, '0.date', new Date());
                    if (oldestDate && newestDate) {
                        result.minDate = oldestDate;
                        result.maxDate = newestDate;
                    }
                    const _paymentMethods = await ctx.call('v1.payment-methods.find', {fields: '_id name'});
                    const paymentMethods = {};
                    _.each(_paymentMethods, paymentMethod => {
                        paymentMethods[paymentMethod._id.toString()] = paymentMethod.name;
                    });

                    _.each(orders, order => {
                        const date = moment(order.date).format(dateFormat);
                        _.each(order.items, item => {
                            const amount = item.amount;
                            result.amount += amount;
                            const discount = _.get(item, 'discount', 0);
                            result.discount += discount;
                            result.items.push({
                                date,
                                name: item.name,
                                place: places[order.place.toString()],
                                quantity: item.quantity,
                                amount,
                                discount,
                                paymentMethod: paymentMethods[order.paymentMethod.toString()],
                            });
                        });
                    });

                    if (save) {

                        const wb = new xl.Workbook();
                        const ws = wb.addWorksheet(ctx.meta.__('sales-report'));

                        const style = wb.createStyle({
                            font: {
                                bold: true
                            },
                        });

                        ws.column(1).setWidth(15);
                        ws.column(2).setWidth(50);
                        ws.column(3).setWidth(50);
                        ws.column(4).setWidth(15);
                        ws.column(5).setWidth(15);
                        ws.column(6).setWidth(15);
                        ws.column(7).setWidth(25);

                        ws.cell(1, 1).string(ctx.meta.__('date')).style(style);
                        ws.cell(1, 2).string(ctx.meta.__('product')).style(style);
                        ws.cell(1, 3).string(ctx.meta.__('place')).style(style);
                        ws.cell(1, 4).string(ctx.meta.__('quantity')).style(style);
                        ws.cell(1, 5).string(ctx.meta.__('amount')).style(style);
                        ws.cell(1, 6).string(ctx.meta.__('discount')).style(style);
                        ws.cell(1, 7).string(ctx.meta.__('payment-method')).style(style);

                        let index = 2;

                        _.each(result.items, item => {
                            ws.cell(index, 1).string(item.date);
                            ws.cell(index, 2).string(item.name);
                            ws.cell(index, 3).string(item.place);
                            ws.cell(index, 4).number(item.quantity);
                            ws.cell(index, 5).number(item.amount);
                            ws.cell(index, 6).number(item.discount);
                            ws.cell(index, 7).string(item.paymentMethod);
                            index++;
                        });

                        ws.cell(index, 5).number(result.amount).style(style);
                        ws.cell(index, 6).number(result.discount).style(style);

                        const file = uniqid.time(`report-`, '.xlsx');

                        result.file = file;

                        console.log(path.join(dir, file));

                        wb.write(path.join(dir, file));

                    }

                }

                return result;

            }
        },
        // v1.orders.getReport
        getReport: {
            rest: 'GET /report/:file',
            cache: false,
            params: {
                file: 'string',
            },
            async handler(ctx) {
                return fs.readFileSync(path.join(dir, ctx.params.file));
            }
        }
    },
    methods: {
        async toDB(methodid, orderItems, lang) {

            const paymentMethod = await this.broker.call('v1.payment-methods.get', {id: methodid, fields: 'type'});
            const isBonuses = _.get(paymentMethod, 'type') === 'bonuses';

            const units = await this.broker.call('v1.units.get', {language: lang});
            const result = {
                items: [],
                amount: 0,
                discount: 0,
            };
            const products = {};
            const productids = [];
            const modifiers = {};
            const modifierids = [];
            // собираем идентификаторы
            _.each(orderItems, orderItem => {
                productids.push(orderItem.productid);
                _.each(orderItem.modifiers, (modifier) => {
                    modifierids.push(modifier.modifierid);
                });
            });
            // собираем модификаторы
            if (_.size(modifierids)) {
                const _modifiers = await this.broker.call('v1.modifiers.find', {
                    query: {'items._id': {$in: modifierids}},
                });
                _.each(_modifiers, modifier => {
                    _.each(modifier.items, item => {
                        modifiers[item._id.toString()] = item;
                    });
                });
            }
            // собираем товары
            if (_.size(productids)) {
                const _products = await this.broker.call('v1.products.find', {
                    query: {_id: {$in: productids}},
                    sort: 'order',
                    fields: '_id name gallery prices',
                });
                _.each(_products, product => {
                    products[product._id.toString()] = product;
                });
            }
            // собираем заказ
            _.each(orderItems, orderItem => {
                const product = products[orderItem.productid];
                if (product) {
                    let priceid = orderItem.priceid;
                    let productPrice = product.prices[0];
                    _.each(product.prices, priceItem => {
                        const parts = _.split(orderItem.priceid, '-');
                        if (_.size(parts) > 1) {
                            priceid = parts[0];
                        }
                        if (priceItem.id === priceid) {
                            productPrice = priceItem;
                            return false;
                        }
                    });
                    let amount = isBonuses ? productPrice.price : _.get(orderItem, 'amount', productPrice.price);
                    let discount = isBonuses ? productPrice.price : productPrice.price - amount;
                    result.discount += discount;
                    const push = {
                        product: product._id,
                        name: `${product.name} (${productPrice.value} ${units[productPrice.type]})`,
                        picture: productPrice.picture || product.gallery[0].picture,
                        price: priceid,
                        amount,
                        discount,
                        quantity: orderItem.quantity,
                        ready: false,
                    };
                    if (orderItem.seasonid) {
                        push.season = mongoose.Types.ObjectId(orderItem.seasonid);
                    }
                    if (orderItem.giftid) {
                        push.gift = mongoose.Types.ObjectId(orderItem.giftid);
                    }
                    if (_.size(orderItem.modifiers)) {
                        push.modifiers = [];
                        const orderModifiers = orderItem.modifiers;
                        _.each(orderModifiers, orderModifier => {
                            const modifier = modifiers[orderModifier.modifierid];
                            if (modifier) {
                                amount += orderModifier.quantity * modifier.price;
                                push.modifiers.push({
                                    modifier: modifier._id,
                                    name: modifier.name,
                                    picture: modifier.picture,
                                    amount: modifier.price,
                                    quantity: orderModifier.quantity,
                                });
                            }
                        });
                    }
                    result.items.push(push);
                    result.amount += amount * orderItem.quantity;
                }
            });
            return result;
        },
        getPrice(units, prices, priceid) {
            let item = prices[0];
            for (let t = 0; t < prices.length; t++) {
                if (typeof priceid === 'string') {
                    let parts = _.split(priceid, '-');
                    if (parts.length > 1) {
                        priceid = parts[0];
                    }
                }
                if (prices[t].id === priceid) {
                    item = prices[t];
                }
            }
            return item;
        },
        getModifiers(productModifiers, orderModifiers) {

            const result = {};

            _.each(orderModifiers, (modifier, modifierid) => {

                const name = modifier.name;
                const descriptions = [];
                const items = {};
                let price = 0;

                if (productModifiers[modifierid]) {
                    _.each(modifier.items, (value, itemid) => {
                        const modifierItem = _.get(productModifiers, [modifierid, itemid]);
                        if (modifierItem) {
                            descriptions.push(`${_.toLower(modifierItem.name)} ${value} x ${cost(modifierItem.price)} = ${cost(modifierItem.price * value)}`);
                            price += modifierItem.price * value;
                            items[itemid] = value;
                        }
                    });
                    if (_.size(items) > 0) {
                        result[modifierid] = {
                            name: name,
                            description: `${name}: ${_.join(descriptions, ', ')}. `,
                            price,
                            items: items
                        };
                    }
                }
            });

            return result;

        },
    },
};
