const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const CustomerModel = require('../models/customer.model');
const {MoleculerServerError} = require('moleculer').Errors;
const MongooseMixin = require('../mixins/mongoose.mixin');
const passwordGenerator = require('password-generator');
const {clearPhone} = require('../helpers/phone');
const {isTest} = require('../helpers/test');
const {sha256} = require('../helpers/crypto');
const {generateToken} = require('../helpers/token');
const AuthorizeMixin = require('../mixins/authorize.mixin');

const {customAlphabet} = require('nanoid');
const nanoid = customAlphabet('0123456789', 4);

module.exports = {
    name: 'customers',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: CustomerModel,
    hooks: {
        before: {
            '*': 'hasAccess',
        }
    },
    settings: {
        rest: '/v1',
    },
    events: {
        'order:created': {
            async handler(ctx) {
                const order = ctx.params.order;
                if (order.customer) {
                    const ops = [];
                    _.each(order.items, item => {
                        ops.push({
                            updateOne: {
                                filter: {_id: order.customer},
                                update: {$addToSet: {ordered: item.product}, $inc: {purchases: 1}},
                            }
                        });
                    });
                    if (_.size(ops)) {
                        await this.adapter.model.bulkWrite(ops);
                    }
                }
            }
        },
        'product:deleted': {
            async handler(ctx) {
                const product = ctx.params.product;
                await this.adapter.model.updateMany({ordered: product._id}, {$pull: {ordered: product._id}});
            }
        },
        'bonus:created': {
            async handler(ctx) {
                console.log(ctx.params);
                const placeid = ctx.params.placeid;
                const customerid = ctx.params.customerid;
                const amount = ctx.params.amount;
                if (placeid) {
                    const customer = await this.adapter.model.findOne({_id: customerid});
                    if (customer) {
                        let add = true;
                        const places = customer.places || [];
                        _.each(places, place => {
                            if (place._id.toString() === placeid) {
                                add = false;
                                return false;
                            }
                        });
                        if (add) {
                            places.push({_id: placeid});
                            await this.adapter.model.updateOne({_id: customerid}, {places});
                        }
                    }
                    await this.adapter.model.updateOne({_id: customerid, 'places._id': placeid}, {$inc: {'places.$.bonuses': amount}});
                } else {
                    await this.adapter.model.updateOne({_id: customerid}, {$inc: {bonuses: amount}});
                }
            }
        }
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
        // v1.customers.check
        check: {
            rest: 'POST /customer/check',
            cache: false,
            params: {
                id: 'objectID',
                token: 'string',
                placeid: {
                    type: 'objectID',
                    optional: true,
                },
            },
            async handler(ctx) {
                const customer = await this.adapter.model.findOne({_id: ctx.params.id});
                if (_.get(customer, 'token') === ctx.params.token) {
                    return this.customerData(customer);
                } else {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }
            }
        },
        // v1.customers.signIn
        signIn: {
            rest: 'POST /customer/auth',
            cache: false,
            params: {
                phone: {
                    type: 'string',
                    optional: true,
                },
                email: {
                    type: 'email',
                    optional: true,
                    normalize: true,
                },
            },
            async handler(ctx) {

                const query = {};
                const insert = {
                    name: ctx.meta.__('customer'),
                    token: await generateToken(),
                };

                if (ctx.params.phone) {
                    const phone = clearPhone(ctx.params.phone);
                    query.phone = phone;
                    insert.phone = phone;
                } else if (ctx.params.email) {
                    const email = ctx.params.email;
                    query.email = email;
                    insert.email = email;
                } else {
                    throw new MoleculerServerError(ctx.meta.__('required-fields'));
                }

                let exists = true;
                let customer = await this.adapter.model.findOne(query);
                if (!customer) {
                    exists = false;
                    customer = await this.adapter.model.findOneAndUpdate(query, {$setOnInsert: insert}, {upsert: true, new: true});
                }

                if (customer.test && customer.code) {
                    if (customer.phone) {
                        await this.broker.cacher.client.set(customer.phone, customer.code);
                    }
                    if (customer.email) {
                        await this.broker.cacher.client.set(customer.email, customer.code);
                    }
                } else {
                    await this.broker.emit('code:created', {customer});
                }

                if (!exists) {
                    await this.broker.emit('customer:created', {customer});
                }

                return {ok: true};

            }
        },
        // v1.customers.otp
        otp: {
            rest: 'POST /customer/otp',
            cache: false,
            params: {
                phone: {
                    type: 'string',
                    optional: true,
                },
                email: {
                    type: 'email',
                    optional: true,
                    normalize: true,
                },
                code: {
                    type: 'string',
                },
            },
            async handler(ctx) {

                const code = _.trim(ctx.params.code);
                const query = {};

                if (ctx.params.phone) {
                    const phone = clearPhone(ctx.params.phone);
                    if (code !== await this.broker.cacher.client.get(phone)) {
                        throw new MoleculerServerError(ctx.meta.__('incorrect-code'));
                    }
                    query.phone = phone;
                } else if (ctx.params.email) {
                    const email = ctx.params.email;
                    if (code !== await this.broker.cacher.client.get(email)) {
                        throw new MoleculerServerError(ctx.meta.__('incorrect-code'));
                    }
                    query.email = email;
                } else {
                    throw new MoleculerServerError(ctx.meta.__('required-fields'));
                }

                const customer = await this.adapter.model.findOne(query);

                if (_.isEmpty(customer)) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }

                return this.customerData(customer);

            }
        },
        // v1.customers.signOut
        signOut: {
            cache: false,
            async handler(ctx) {
                return {ok: true};
            },
        },
        // v1.customers.profile
        profile: {
            rest: 'POST /customer/profile',
            cache: false,
            params: {
                id: 'objectID',
                name: 'string',
                email: {
                    type: 'email',
                    normalize: true,
                    optional: true,
                },
                phone: {
                    type: 'string',
                    optional: true,
                },
            },
            async handler(ctx) {

                const customer = await this.adapter.model.findOne({_id: ctx.params.id});
                if (!customer) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }

                customer.name = _.trim(ctx.params.name);

                const authorization = _.get(this.broker.metadata, 'authorization');
                if (authorization === 'email') {
                    customer.phone = ctx.params.phone;
                } else {
                    customer.email = ctx.params.email;
                }

                await ctx.call('v1.customers.updateOne', {
                    filter: {_id: ctx.params.id},
                    doc: {name: customer.name, email: customer.email, phone: customer.phone}
                }).catch(() => {
                    throw new MoleculerServerError(ctx.meta.__('customer-exists'));
                });

                return this.customerData(customer);

            }
        },
        code: {
            rest: 'GET /customer/code/:id',
            cache: false,
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const customer = await this.adapter.model.findOne({_id: id});
                if (!customer) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }

                const gifts = await ctx.call('v1.gifts.find', {fields: '_id'});
                if (_.size(gifts) === 1) {
                    const gift = gifts[0];
                    const customerGift = await ctx.call('v1.customer-gifts.findOne', {query: {customer: customer._id, gift: gift._id}});
                    if (customerGift) {
                        const minutes = Math.floor((new Date().getTime() - customerGift.updated.getTime()) / 60000);
                        const interval = _.get(this.broker.metadata, 'qrcode.interval', 60);
                        if (minutes < interval) {
                            throw new MoleculerServerError(ctx.meta.__('gift-try-later'));
                        }
                    }
                }

                const code = nanoid();
                const key = `code:${code}`;
                const expire = isTest() ? 3600 : 300;

                await this.broker.cacher.client.multi()
                    .hmset(key, 'type', 'customer')
                    .hmset(key, 'id', id)
                    .hmset(key, 'code', code)
                    .expire(key, expire)
                    .exec();

                return {code};

            }
        },
        items: {
            role: 'customers:read',
            rest: 'GET /user/customers',
            cache: false,
            params: {
                page: {
                    type: 'number',
                    positive: true,
                    convert: true,
                    default: 1,
                },
            },
            async handler(ctx) {

                const search = ctx.params.search;
                const page = ctx.params.page;

                const result = [];

                const customers = await ctx.call('v1.customers.find', {
                    search, searchFields: 'name email phone', limit: 100,
                    sort: '-date',
                    offset: page > 1 ? ((page - 1) * 100) : 0,
                });
                _.each(customers, customer => {
                    result.push({
                        customerid: customer._id,
                        name: customer.name,
                        email: customer.email,
                        phone: customer.phone,
                        avatar: customer.avatar,
                        purchases: customer.purchases,
                        test: customer.test,
                    });
                });

                return result;

            }
        },
        item: {
            role: 'customers:read',
            rest: 'GET /user/customer/:customerid',
            cache: false,
            params: {
                customerid: 'objectID',
            },
            async handler(ctx) {

                const customerid = ctx.params.customerid;

                const customer = await ctx.call('v1.customers.findOne', {query: {_id: customerid}});
                if (!customer) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }

                return {
                    customerid: customer._id,
                    name: customer.name,
                    phone: customer.phone,
                    email: customer.email,
                    avatar: customer.avatar,
                    test: customer.test,
                    code: customer.code,
                };

            }
        },
        add: {
            role: 'customers:write',
            rest: 'POST /user/customer',
            cache: false,
            async handler(ctx) {

                const avatar = ctx.params.avatar;
                const name = _.trim(ctx.params.name) || ctx.meta.__('customer');
                const email = _.trim(_.toLower(ctx.params.email));
                const phone = clearPhone(ctx.params.phone);
                const password = sha256(ctx.params.password);
                const token = await generateToken();
                const test = ctx.params.test;
                const code = _.trim(ctx.params.code);

                const set = {};
                set.name = name;
                set.phone = phone;
                set.password = password;
                set.token = token;
                if (test) {
                    set.test = test;
                }
                if (code) {
                    set.code = code;
                }
                if (email) {
                    set.email = email;
                }
                if (avatar) {
                    set.avatar = avatar;
                }

                await ctx.call('v1.customers.create', set).catch(() => {
                    throw new MoleculerServerError(ctx.meta.__('customer-exists'));
                });

                return {ok: true};

            }
        },
        edit: {
            role: 'customers:write',
            rest: 'PATCH /user/customer',
            cache: false,
            params: {
                customerid: 'objectID',
            },
            async handler(ctx) {

                const customerid = ctx.params.customerid;
                const avatar = ctx.params.avatar;
                const name = _.trim(ctx.params.name) || ctx.meta.__('customer');
                const email = _.trim(_.toLower(ctx.params.email));
                const phone = clearPhone(ctx.params.phone);
                const test = ctx.params.test;
                const code = _.trim(ctx.params.code);

                const set = {};
                const unset = {};
                set.name = name;
                set.phone = phone;
                if (test) {
                    set.test = test;
                } else {
                    unset.test = '';
                }
                if (code) {
                    set.code = code;
                } else {
                    unset.code = '';
                }
                if (email) {
                    set.email = email;
                } else {
                    unset.email = '';
                }
                if (avatar) {
                    set.avatar = avatar;
                } else {
                    unset.avatar = '';
                }
                if (ctx.params.password) {
                    const password = sha256(ctx.params.password);
                    const token = await generateToken();
                    set.password = password;
                    set.token = token;
                }

                const doc = {$set: set};
                if (_.size(unset)) {
                    doc.$unset = unset;
                }

                await ctx.call('v1.customers.updateOne', {filter: {_id: customerid}, doc});

                return {ok: true};

            }
        },
        delete: {
            role: 'customers:write',
            rest: 'DELETE /user/customer/:customerid',
            cache: false,
            params: {
                customerid: 'objectID',
            },
            async handler(ctx) {

                const customerid = ctx.params.customerid;

                const customer = await ctx.call('v1.customers.findOne', {query: {_id: customerid}});
                if (!customer) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }

                await ctx.call('v1.customers.deleteOne', {query: {_id: customerid}});

                await this.broker.emit('customer:deleted', {customer});

                return {ok: true};

            }
        },
    },
    methods: {
        customerData(data, token) {
            return {
                id: data._id || data.id,
                name: data.name,
                email: data.email,
                phone: data.phone,
                avatar: data.avatar,
                birthday: data.birthday,
                balance: data.balance,
                bonuses: data.bonuses,
                token: token || data.token,
            };
        },
        generatePassword() {
            return passwordGenerator(8, true);
        }
    }
};
