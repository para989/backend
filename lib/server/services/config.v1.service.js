const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const ConfigModel = require('../models/config.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const AuthorizeMixin = require('../mixins/authorize.mixin');

module.exports = {
    name: 'config',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: ConfigModel,
    hooks: {
        before: {
            '*': 'hasAccess',
        }
    },
    settings: {
        rest: '/v1',
    },
    events: {
        'config:changed': {
            async handler(ctx) {
                await this.update();
            },
        },
    },
    async created() {
        await this.update();
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

        user: {
            rest: 'GET /user/config',
            async handler(ctx) {
                const units = await ctx.call('v1.units.get');
                const colors = await ctx.call('v1.colors.get');
                return {
                    units,
                    colors,
                    lang: global.LANG,
                    brands: global.BRANDS,
                    delivery: global.DELIVERY,
                };
            },
        },

        getBasic: {
            role: 'settings:read',
            rest: 'GET /user/config/basic',
            async handler() {
                const keys = ['name', 'organization', 'authorization'];
                const items = await this.adapter.model.find({key: {$in: keys}});
                const result = {};
                _.each(items, item => {
                    result[item.key] = _.get(item, 'value');
                });
                return result;
            },
        },
        setBasic: {
            role: 'settings:write',
            rest: 'PATCH /user/config/basic',
            params: {
                name: 'string',
                organization: 'string',
                authorization: 'string',
            },
            async handler(ctx) {
                const ops = [];
                ops.push({
                    updateOne: {
                        filter: {key: 'name'},
                        update: {value: _.trim(ctx.params.name)},
                        upsert: true,
                    }
                });
                const organization = _.trim(ctx.params.organization);
                if (organization) {
                    ops.push({
                        updateOne: {
                            filter: {key: 'organization'},
                            update: {value: organization},
                            upsert: true,
                        }
                    });
                } else {
                    ops.push({
                        deleteOne: {
                            filter: {key: 'organization'},
                        }
                    });
                }
                ops.push({
                    updateOne: {
                        filter: {key: 'authorization'},
                        update: {value: ctx.params.authorization},
                        upsert: true,
                    }
                });
                await this.adapter.model.bulkWrite(ops);
                await this.broker.broadcast('config:changed');
            },
        },

        getNotification: {
            role: 'settings:read',
            rest: 'GET /user/config/notification',
            async handler() {
                const notification = await this.adapter.model.findOne({key: 'notification'});
                return {notification: _.get(notification, 'value')};
            },
        },
        setNotification: {
            role: 'settings:write',
            rest: 'PATCH /user/config/notification',
            params: {
                notification: 'object',
            },
            async handler(ctx) {
                await this.adapter.model.findOneAndUpdate({key: 'notification'}, {value: ctx.params.notification}, {upsert: true});
                await this.broker.broadcast('config:changed');
            },
        },

        getSms: {
            role: 'settings:read',
            rest: 'GET /user/config/sms',
            async handler() {
                const sms = await this.adapter.model.findOne({key: 'sms'});
                return {sms: _.get(sms, 'value')};
            },
        },
        setSms: {
            role: 'settings:write',
            rest: 'PATCH /user/config/sms',
            params: {
                sms: 'object',
            },
            async handler(ctx) {
                await this.adapter.model.findOneAndUpdate({key: 'sms'}, {value: ctx.params.sms}, {upsert: true});
                await this.broker.broadcast('config:changed');
            },
        },

        getMaps: {
            role: 'settings:read',
            rest: 'GET /user/config/maps',
            async handler() {
                const maps = await this.adapter.model.findOne({key: 'maps'});
                return {maps: _.get(maps, 'value')};
            },
        },
        setMaps: {
            role: 'settings:write',
            rest: 'PATCH /user/config/maps',
            params: {
                maps: 'object',
            },
            async handler(ctx) {
                await this.adapter.model.findOneAndUpdate({key: 'maps'}, {value: ctx.params.maps}, {upsert: true});
                await this.broker.broadcast('config:changed');
            },
        },

        getEmail: {
            role: 'settings:read',
            rest: 'GET /user/config/email',
            async handler() {
                const keys = ['email'];
                const items = await this.adapter.model.find({key: {$in: keys}});
                const result = {};
                _.each(items, item => {
                    result[item.key] = _.get(item, 'value');
                });
                return result;
            },
        },
        setEmail: {
            role: 'settings:write',
            rest: 'PATCH /user/config/email',
            params: {
                email: 'object',
            },
            async handler(ctx) {
                const ops = [];
                ops.push({
                    updateOne: {
                        filter: {key: 'email'},
                        update: {value: ctx.params.email},
                        upsert: true,
                    }
                });
                await this.adapter.model.bulkWrite(ops);
                await this.broker.broadcast('config:changed');
            },
        },

        getCall: {
            role: 'settings:read',
            rest: 'GET /user/config/call',
            async handler() {
                const call = await this.adapter.model.findOne({key: 'call'});
                return {call: _.get(call, 'value')};
            },
        },
        setCall: {
            role: 'settings:write',
            rest: 'PATCH /user/config/call',
            params: {
                call: 'object',
            },
            async handler(ctx) {
                await this.adapter.model.findOneAndUpdate({key: 'call'}, {value: ctx.params.call}, {upsert: true});
                await this.broker.broadcast('config:changed');
            },
        },

        getApps: {
            role: 'settings:read',
            rest: 'GET /user/config/apps',
            async handler() {
                const keys = ['apps'];
                const items = await this.adapter.model.find({key: {$in: keys}});
                const result = {};
                _.each(items, item => {
                    result[item.key] = _.get(item, 'value', '');
                });
                return result;
            },
        },
        setApps: {
            role: 'settings:write',
            rest: 'PATCH /user/config/apps',
            params: {
                apps: {
                    type: 'object',
                },
            },
            async handler(ctx) {
                const apps = ctx.params.apps;
                if (_.size(apps)) {
                    await this.adapter.model.findOneAndUpdate({key: 'apps'}, {value: apps}, {upsert: true});
                } else {
                    await this.adapter.model.deleteOne({key: 'apps'});
                }
                await this.broker.broadcast('config:changed');
            },
        },

        getBot: {
            role: 'settings:read',
            rest: 'GET /user/config/bot',
            async handler() {
                const bot = await this.adapter.model.findOne({key: 'bot'});
                return {bot: _.get(bot, 'value')};

            },
        },
        setBot: {
            role: 'settings:write',
            rest: 'PATCH /user/config/bot',
            params: {
                bot: 'object',
            },
            async handler(ctx) {
                await this.adapter.model.findOneAndUpdate({key: 'bot'}, {value: ctx.params.bot}, {upsert: true});
                await this.broker.broadcast('config:changed');
            },
        },

        getCashback: {
            role: 'settings:read',
            rest: 'GET /user/config/cashback',
            async handler() {
                const cashback = await this.adapter.model.findOne({key: 'cashback'});
                return {cashback: _.get(cashback, 'value')};
            },
        },
        setCashback: {
            role: 'settings:write',
            rest: 'PATCH /user/config/cashback',
            params: {
                cashback: 'object',
            },
            async handler(ctx) {
                await this.adapter.model.findOneAndUpdate({key: 'cashback'}, {value: ctx.params.cashback}, {upsert: true});
                await this.broker.broadcast('config:changed');
            },
        },

        getSocials: {
            role: 'settings:read',
            rest: 'GET /user/config/socials',
            async handler() {
                const socials = await this.adapter.model.findOne({key: 'socials'});
                return {socials: _.get(socials, 'value', [])};

            },
        },
        setSocials: {
            role: 'settings:write',
            rest: 'PATCH /user/config/socials',
            params: {
                socials: 'array',
            },
            async handler(ctx) {
                const socials = ctx.params.socials;
                if (_.size(socials)) {
                    await this.adapter.model.findOneAndUpdate({key: 'socials'}, {value: socials}, {upsert: true});
                } else {
                    await this.adapter.model.deleteOne({key: 'socials'});
                }
                await this.broker.broadcast('config:changed');
            },
        },

        getSite: {
            role: 'settings:read',
            rest: 'GET /user/config/site',
            async handler() {
                const keys = ['title', 'description', 'keywords', 'css', 'javascript', 'meta'];
                const items = await this.adapter.model.find({key: {$in: keys}});
                const result = {};
                _.each(items, item => {
                    result[item.key] = _.get(item, 'value', '');
                });
                return result;
            },
        },
        setSite: {
            role: 'settings:write',
            rest: 'PATCH /user/config/site',
            params: {
                title: 'string',
                description: 'string',
                keywords: 'string',
                css: 'string',
                javascript: 'string',
                meta: 'array',
            },
            async handler(ctx) {
                const ops = [];
                const title = _.trim(ctx.params.title);
                if (title) {
                    ops.push({
                        updateOne: {
                            filter: {key: 'title'},
                            update: {value: title},
                            upsert: true,
                        }
                    });
                } else {
                    ops.push({
                        deleteOne: {
                            filter: {key: 'title'},
                        }
                    });
                }
                const description = _.trim(ctx.params.description);
                if (description) {
                    ops.push({
                        updateOne: {
                            filter: {key: 'description'},
                            update: {value: description},
                            upsert: true,
                        }
                    });
                } else {
                    ops.push({
                        deleteOne: {
                            filter: {key: 'description'},
                        }
                    });
                }
                const keywords = _.trim(ctx.params.keywords);
                if (keywords) {
                    ops.push({
                        updateOne: {
                            filter: {key: 'keywords'},
                            update: {value: keywords},
                            upsert: true,
                        }
                    });
                } else {
                    ops.push({
                        deleteOne: {
                            filter: {key: 'keywords'},
                        }
                    });
                }
                const css = _.trim(ctx.params.css);
                if (css) {
                    ops.push({
                        updateOne: {
                            filter: {key: 'css'},
                            update: {value: css},
                            upsert: true,
                        }
                    });
                } else {
                    ops.push({
                        deleteOne: {
                            filter: {key: 'css'},
                        }
                    });
                }
                const javascript = _.trim(ctx.params.javascript);
                if (javascript) {
                    ops.push({
                        updateOne: {
                            filter: {key: 'javascript'},
                            update: {value: javascript},
                            upsert: true,
                        }
                    });
                } else {
                    ops.push({
                        deleteOne: {
                            filter: {key: 'javascript'},
                        }
                    });
                }
                const meta = ctx.params.meta;
                if (_.size(meta)) {
                    ops.push({
                        updateOne: {
                            filter: {key: 'meta'},
                            update: {value: meta},
                            upsert: true,
                        }
                    });
                } else {
                    ops.push({
                        deleteOne: {
                            filter: {key: 'meta'},
                        }
                    });
                }
                await this.adapter.model.bulkWrite(ops);
                await this.broker.broadcast('config:changed');
            },
        },

        getTheme: {
            role: 'settings:read',
            rest: 'GET /user/config/theme',
            async handler() {
                const keys = ['logo', 'icon', 'banner', 'colors'];
                const items = await this.adapter.model.find({key: {$in: keys}});
                const result = {};
                _.each(items, item => {
                    result[item.key] = _.get(item, 'value', '');
                });
                const colors = {
                    bodyColor: '#737491',
                    primary: '#766df4',
                    secondary: '#f7f7fc',
                    info: '#6a9bf4',
                    success: '#16c995',
                    warning: '#ffb15c',
                    danger: '#f74f78',
                    light: '#FFFFFF',
                    dark: '#37384e',
                    priceColor: '#766df4',
                };
                result.colors = _.defaults(result.colors, colors);
                return result;
            },
        },
        setTheme: {
            role: 'settings:write',
            rest: 'PATCH /user/config/theme',
            params: {
                colors: 'object',
            },
            async handler(ctx) {
                const ops = [];
                const colors = ctx.params.colors;
                if (_.size(colors)) {
                    ops.push({
                        updateOne: {
                            filter: {key: 'colors'},
                            update: {value: colors},
                            upsert: true,
                        }
                    });
                } else {
                    ops.push({
                        deleteOne: {
                            filter: {key: 'colors'},
                        }
                    });
                }
                await this.adapter.model.bulkWrite(ops);
                await this.broker.broadcast('config:changed');
                await this.broker.broadcast('css:updated');
            },
        },

        getQRCode: {
            role: 'settings:read',
            rest: 'GET /user/config/qrcode',
            async handler() {
                const qrcode = await this.adapter.model.findOne({key: 'qrcode'});
                return {qrcode: _.get(qrcode, 'value')};
            },
        },
        setQRCode: {
            role: 'settings:write',
            rest: 'PATCH /user/config/qrcode',
            params: {
                enabled: {
                    type: 'boolean',
                    convert: true,
                },
                interval: {
                    type: 'number',
                    min: 1,
                    integer: true,
                    convert: true,
                },
            },
            async handler(ctx) {
                const value = {enabled: ctx.params.enabled, interval: ctx.params.interval};
                await this.adapter.model.findOneAndUpdate({key: 'qrcode'}, {value}, {upsert: true});
                await this.broker.broadcast('config:changed');
            },
        },

    },
    methods: {
        async update() {
            await this.broker.cacher.clean('v1.config.**');
            const items = await this.adapter.model.find();
            _.each(items, item => {
                _.set(this.broker.metadata, item.key, item.value);
            });
            if (!_.get(this.broker.metadata, 'authorization')) {
                _.set(this.broker.metadata, 'authorization', 'email');
            }
            await this.broker.broadcast('content:updated');
        }
    },
};
