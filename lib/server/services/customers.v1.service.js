const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const CustomerModel = require('../models/customer.model');
const {MoleculerServerError} = require('moleculer').Errors;
const MongooseMixin = require('../mixins/mongoose.mixin');
const passwordGenerator = require('password-generator');
const {cleanPhone} = require('../helpers/phone');
const urllib = require('urllib');
const {isTest} = require("../helpers/test");
const {sha256} = require("../helpers/crypto");
const {generateToken} = require("../helpers/token");

const {customAlphabet} = require('nanoid');
const nanoid = customAlphabet('0123456789', 4);

module.exports = {
    name: 'customers',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: CustomerModel,
    actions: {
        get: {
            cache: false,
        },
        find: {
            cache: false,
        },
        // v1.customers.check
        check: {
            cache: false,
            params: {
                id: 'objectID',
                token: 'string',
            },
            async handler(ctx) {
                const customer = await ctx.call('v1.customers.get', {id: ctx.params.id});
                if (_.get(customer, 'token') === ctx.params.token) {
                    return this.customerData(customer);
                } else {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }
            }
        },
        // v1.customers.signIn
        signIn: {
            cache: false,
            params: {
                phone: {
                    type: 'string',
                },
            },
            async handler(ctx) {

                const phone = cleanPhone(ctx.params.phone);
                const token = await generateToken();

                await ctx.call('v1.customers.findOneAndUpdate', {
                    conditions: {
                        phone
                    },
                    update: {
                        $setOnInsert: {
                            phone,
                            token,
                        },
                    },
                    options: {
                        upsert: true,
                        new: true,
                    },
                });

                const params = {};
                params.service_id = _.get(this.broker.metadata, 'ucaller.id');
                params.key = _.get(this.broker.metadata, 'ucaller.key');
                params.phone = phone;

                let code;

                if (phone === '70000000000') {
                    code = '3168';
                } else {
                    const response = await urllib.request('https://api.ucaller.ru/v1.0/initCall', {method: 'GET', data: params, dataType: 'json'});
                    if (response.data.error) {
                        throw new MoleculerServerError(response.data.error);
                    }
                    code = response.data.code;
                }

                await this.broker.cacher.client.set(phone, code);

                return {ok: true};

            }
        },
        // v1.customers.otp
        otp: {
            cache: false,
            params: {
                phone: {
                    type: 'string',
                },
                code: {
                    type: 'string',
                },
            },
            async handler(ctx) {

                const phone = cleanPhone(ctx.params.phone);
                const code = _.trim(ctx.params.code);

                if (code !== await this.broker.cacher.client.get(phone)) {
                    throw new MoleculerServerError(ctx.meta.__('incorrect-code'));
                }

                const customer = await ctx.call('v1.customers.findOne', {conditions: {phone}});

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
            cache: false,
            params: {
                id: 'objectID',
                name: 'string',
                email: 'email',
            },
            async handler(ctx) {

                const customer = await ctx.call('v1.customers.get', {id: ctx.params.id});
                if (!customer) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }

                customer.name = _.trim(ctx.params.name);
                customer.email = _.trim(_.toLower(ctx.params.email));

                await ctx.call('v1.customers.updateOne', {
                    filter: {_id: ctx.params.id},
                    doc: {name: ctx.params.name, email: ctx.params.email}
                }).catch(() => {
                    throw new MoleculerServerError(ctx.meta.__('customer-exists'));
                });

                return this.customerData(customer);

            }
        },


        items: {
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
                    });
                });

                return result;

            }
        },
        item: {
            cache: false,
            params: {
                customerid: 'objectID',
            },
            async handler(ctx) {

                const customerid = ctx.params.customerid;

                const customer = await ctx.call('v1.customers.findOne', {conditions: {_id: customerid}});
                if (!customer) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }

                return {
                    customerid: customer._id,
                    name: customer.name,
                    phone: customer.phone,
                    email: customer.email,
                    avatar: customer.avatar,
                };

            }
        },
        add: {
            cache: false,
            async handler(ctx) {

                const avatar = ctx.params.avatar;
                const name = _.trim(ctx.params.name);
                const email = _.trim(_.toLower(ctx.params.email));
                const phone = cleanPhone(ctx.params.phone);
                const password = sha256(ctx.params.password);
                const token = await generateToken();

                const set = {};
                set.name = name;
                set.phone = phone;
                set.password = password;
                set.token = token;
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
            cache: false,
            params: {
                customerid: 'objectID',
            },
            async handler(ctx) {

                const customerid = ctx.params.customerid;
                const avatar = ctx.params.avatar;
                const name = _.trim(ctx.params.name);
                const email = _.trim(_.toLower(ctx.params.email));
                const phone = cleanPhone(ctx.params.phone);

                const set = {};
                const unset = {};
                set.name = name;
                set.phone = phone;
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
            cache: false,
            params: {
                customerid: 'objectID',
            },
            async handler(ctx) {

                const customerid = ctx.params.customerid;

                const customer = await ctx.call('v1.customers.findOne', {conditions: {_id: customerid}});
                if (!customer) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }

                await ctx.call('v1.customers.deleteOne', {conditions: {_id: customerid}});

                return {ok: true};

            }
        },
        code: {
            cache: false,
            params: {
                customerid: 'objectID',
            },
            async handler(ctx) {

                const customerid = ctx.params.customerid;

                const customer = await ctx.call('v1.customers.get', {id: customerid, fields: 'name'});
                if (!customer) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }

                const code = nanoid();
                const key = `code:${code}`;
                const expire = isTest() ? 3600 : 300;

                await this.broker.cacher.client.multi()
                    .hmset(key, 'type', 'customer')
                    .hmset(key, 'id', customerid)
                    .hmset(key, 'code', code)
                    .expire(key, expire)
                    .exec();

                return {code};

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
