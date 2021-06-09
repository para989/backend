const _ = require('lodash');
const urllib = require('urllib');
const moment = require('moment');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const TelegramSchema = require('../models/telegram.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const Queue = require('bull');
const {cost} = require("../helpers/cost");
const {formatPhone} = require("../helpers/phone");
const {orderNumber} = require("../helpers/order");
const {placeCard} = require('../helpers/place');
const {sha256} = require('../helpers/crypto');
const each = require('each');
const sendQueue = new Queue('telegram-send', {redis: global.REDIS});
const checkQueue = new Queue('telegram-check', {redis: global.REDIS});

module.exports = {
    name: 'telegram',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: TelegramSchema,
    dependencies: [
        'v1.config',
    ],
    settings: {
        rest: '/v1/telegram',
    },
    events: {
        'order:created': {
            async handler(ctx) {
                const order = ctx.params;
                if (order.status === 'new') {
                    this.order(order);
                }
            }
        },
        'order:updated': {
            async handler(ctx) {
                const order = ctx.params;
                if (order.status === 'new') {
                    this.order(order);
                } else if (order.status === 'finished') {
                    this.status(order, 'completed');
                }
            }
        },
    },
    async started() {
        await this.broker.waitForServices(['v1.config']);
        const telegram = _.get(this.broker.metadata, 'telegram');
        if (telegram) {
            const url = `https://${global.DOMAIN}/v1/telegram/receiver`;
            const i18n = this.broker.metadata.i18n;
            this.settings.commands = [
                {command: 'login', description: i18n.__('sign-in')},
                {command: 'logout', description: i18n.__('sign-out')},
                {command: 'orders', description: i18n.__('current-orders')},
            ];
            const getWebhookInfo = await this.exec('getWebhookInfo');
            if (_.get(getWebhookInfo, 'url') !== url) {
                await this.exec('setWebhook', {url});
            }
            await this.exec('setMyCommands', {commands: JSON.stringify(this.settings.commands)});
        }
        sendQueue.process(this.send);
        checkQueue.process(this.check);
        /*if (isTest()) {
            setTimeout(async () => {
                const order = await this.broker.call('v1.orders.get', {id: '60b5070f3abbba42605a6a4a'});
                await this.order(order);
            }, 2000);
        }*/
    },
    actions: {
        get: {
            cache: false,
        },
        find: {
            cache: false,
        },
        receiver: {
            rest: 'POST /receiver',
            cache: false,
            async handler(ctx) {
                const isBot = _.get(ctx.params, 'message.from.is_bot');
                const id = _.get(ctx.params, 'message.from.id');
                const text = _.get(ctx.params, 'message.text');
                if (isBot) {
                    return;
                }
                const user = await this.broker.cacher.client.hgetall(this.key(id));
                const status = _.get(user, 'status');
                if (text === '/start') {
                    this.start(id);
                } else if (text === '/login') {
                    this.email(id);
                } else if (text === '/logout') {
                    this.logout(id);
                } else if (text === '/orders') {
                    this.orders(id);
                } else if (status === 'email') {
                    this.password(id, text);
                } else if (status === 'password') {
                    this.login(id, user.email, text);
                }
            }
        },
    },
    methods: {
        key(id) {
            return `telegram:${id}`;
        },
        async clean(id) {
            return await this.broker.cacher.client.del(this.key(id));
        },
        async start(id) {
            await this.clean(id);
            const i18n = this.broker.metadata.i18n;
            let text = `${i18n.__('bot-welcome')}\n\n`;
            _.each(this.settings.commands, command => {
                text += `/${command.command} - ${_.toLower(command.description)}\n`;
            });
            await this.message(id, text);
        },
        async email(id) {
            const i18n = this.broker.metadata.i18n;
            const key = this.key(id);
            await this.broker.cacher.client.multi()
                .hmset(key, 'status', 'email')
                .expire(key, 600)
                .exec();
            await this.message(id, `${i18n.__('email-placeholder')}:`);
        },
        async password(id, text) {
            const i18n = this.broker.metadata.i18n;
            const key = this.key(id);
            const email = _.toLower(_.trim(text));
            const user = await this.broker.call('v1.users.findOne', {conditions: {email}});
            if (user) {
                await this.broker.cacher.client.multi()
                    .hmset(key, 'email', email)
                    .hmset(key, 'status', 'password')
                    .expire(key, 600)
                    .exec();
                await this.message(id, `${i18n.__('password-placeholder')}:`);
            } else {
                await this.message(id, i18n.__('user-not-found'));
            }
        },
        async login(id, email, text) {
            const i18n = this.broker.metadata.i18n;
            const password = sha256(text);
            const user = await this.broker.call('v1.users.findOne', {conditions: {email}});
            if (user) {
                if (password === user.password) {
                    if (user.role === 'operator') {
                        await this.broker.call('v1.telegram.findOneAndUpdate', {
                            conditions: {
                                id,
                            },
                            update: {
                                user: user._id, id,
                            },
                            options: {
                                upsert: true,
                            },
                        });
                        const place = await this.broker.call('v1.places.get', {id: _.toString(user.places[0])});
                        await this.message(id, i18n.__('is-operator', user.name, placeCard(place).address));
                    } else {
                        await this.message(id, i18n.__('not-operator'));
                    }
                    await this.clean(id);
                } else {
                    await this.message(id, i18n.__('incorrect-password'));
                }
            } else {
                await this.message(id, i18n.__('user-not-found'));
            }
        },
        async logout(id) {
            const i18n = this.broker.metadata.i18n;
            await this.broker.call('v1.telegram.deleteOne', {conditions: {id}});
            await this.clean(id);
            await this.message(id, i18n.__('sign-out-success'));
        },
        async orders(id) {
            const i18n = this.broker.metadata.i18n;
            const item = await this.broker.call('v1.telegram.findOne', {conditions: {id}});
            if (!item) {
                return;
            }
            const user = await this.broker.call('v1.users.get', {id: _.toString(item.user)});
            if (!user) {
                return;
            }
            const where = {
                status: 'new',
                place: {$in: user.places},
            };
            const orders = await this.broker.call('v1.orders.find', {
                query: where,
                limit: 100,
                sort: '-date',
            });
            if (_.size(orders)) {
                each(orders).call(async (order, index, callback) => {
                    await this.order(order, id);
                    callback();
                });
            } else {
                await this.message(id, i18n.__('no-orders'));
            }
        },
        async order(order, id) {
            const i18n = this.broker.metadata.i18n;
            const dateAndTimeFormat = i18n.__('date-and-time-format');
            let text = `<u><b>${i18n.__('order')} #${orderNumber(order.number)}, ${moment(order.date).format(dateAndTimeFormat)}</b></u>\n`;//
            text += `${i18n.__('obtaining')}: ${i18n.__(order.obtaining)}\n`;
            text += `${order.name}: ${formatPhone(order.phone)}\n\n\n`;
            _.each(order.items, item => {
                text += `${item.name}, ${item.quantity} * ${cost(item.amount)} = ${cost(item.quantity * item.amount)}\n`;
                if (_.size(item.modifiers)) {
                    const arr = [];
                    _.each(item.modifiers, modifier => {
                        arr.push(`${_.toLower(modifier.name)} * ${modifier.quantity}`);
                    });
                    text += `<i>${i18n.__('modifiers')}: ${_.join(arr, ', ')}</i>\n`;
                }
                text += `\n`;
            });
            text += `<b>${i18n.__('total')}: ${cost(order.amount)}</b>\n\n\n`;
            if (id) {
                sendQueue.add({id, text}, {removeOnComplete: true});
            } else {
                const users = await this.broker.call('v1.users.find', {query: {places: order.place}, fields: '_id'});
                if (_.size(users)) {
                    const ids = [];
                    _.each(users, user => {
                        ids.push(user._id);
                    });
                    const items = await this.broker.call('v1.telegram.find', {query: {user: {$in: ids}}, fields: 'id'});
                    _.each(items, item => {
                        sendQueue.add({id: item.id, text}, {removeOnComplete: true});
                    });
                }
                checkQueue.add({orderid: order._id.toString()}, {delay: 300000, removeOnComplete: true});
            }
        },
        async status(order, status) {
            const i18n = this.broker.metadata.i18n;
            const text = `<b>${i18n.__('order')} #${orderNumber(order.number)}, ${i18n.__(status)}</b>.`;
            const users = await this.broker.call('v1.users.find', {query: {places: order.place}, fields: '_id'});
            if (_.size(users)) {
                const ids = [];
                _.each(users, user => {
                    ids.push(user._id);
                });
                const items = await this.broker.call('v1.telegram.find', {query: {user: {$in: ids}}, fields: 'id'});
                _.each(items, item => {
                    sendQueue.add({id: item.id, text}, {removeOnComplete: true});
                });
            }
        },
        async message(id, text) {
            await this.exec('sendMessage', {chat_id: id, parse_mode: 'HTML', text});
        },
        async exec(method, data) {
            const options = {};
            options.method = 'POST';
            options.dataType = 'json';
            options.conteType = 'json';
            if (data) {
                options.data = data;
            }
            options.timeout = 60000;
            const res = await urllib.request(`https://api.telegram.org/bot${_.get(this.broker.metadata, 'telegram.key')}/${method}`, options);
            return res.data.ok ? res.data.result : null;
        },
        async send(job, done) {
            const params = job.data;
            await this.message(params.id, params.text);
            done();
        },
        async check(job, done) {
            const params = job.data;
            const order = await this.broker.call('v1.orders.get', {id: params.orderid});
            if (_.get(order, 'status') === 'new') {
                await this.status(order, 'not-completed');
            }
            done();
        },
    }
};
