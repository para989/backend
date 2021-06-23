const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const ConfigModel = require('../models/config.model');
const MongooseMixin = require('../mixins/mongoose.mixin');

module.exports = {
    name: 'config',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: ConfigModel,
    events: {
        'config:changed': {
            async handler(ctx) {
                this.update();
            },
        },
    },
    async started() {
        this.update();
    },
    actions: {
        get: {
            cache: false,
        },
        find: {
            cache: false,
        },
        user: {
            async handler(ctx) {
                const units = await ctx.call('v1.units.get');
                const colors = await ctx.call('v1.colors.get');
                return {units, colors};
            },
        },

        getBasic: {
            async handler() {
                const keys = ['name', 'organization', 'authorization', 'qrcode'];
                const items = await this.adapter.model.find({key: {$in: keys}});
                const result = {};
                _.each(items, item => {
                    result[item.key] = _.get(item, 'value');
                });
                return result;
            },
        },
        setBasic: {
            params: {
                name: 'string',
                organization: 'string',
                authorization: 'string',
                qrcode: 'boolean',
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
                ops.push({
                    updateOne: {
                        filter: {key: 'qrcode'},
                        update: {value: ctx.params.qrcode},
                        upsert: true,
                    }
                });
                await this.adapter.model.bulkWrite(ops);
                await this.broker.broadcast('config:changed');
            },
        },

        getNotification: {
            async handler() {
                const notification = await this.adapter.model.findOne({key: 'notification'});
                return {notification: _.get(notification, 'value')};
            },
        },
        setNotification: {
            params: {
                notification: 'object',
            },
            async handler(ctx) {
                await this.adapter.model.findOneAndUpdate({key: 'notification'}, {value: ctx.params.notification}, {upsert: true});
                await this.broker.broadcast('config:changed');
            },
        },

        getSms: {
            async handler() {
                const sms = await this.adapter.model.findOne({key: 'sms'});
                return {sms: _.get(sms, 'value')};
            },
        },
        setSms: {
            params: {
                sms: 'object',
            },
            async handler(ctx) {
                await this.adapter.model.findOneAndUpdate({key: 'sms'}, {value: ctx.params.sms}, {upsert: true});
                await this.broker.broadcast('config:changed');
            },
        },

        getMaps: {
            async handler() {
                const maps = await this.adapter.model.findOne({key: 'maps'});
                return {maps: _.get(maps, 'value')};
            },
        },
        setMaps: {
            params: {
                maps: 'object',
            },
            async handler(ctx) {
                await this.adapter.model.findOneAndUpdate({key: 'maps'}, {value: ctx.params.maps}, {upsert: true});
                await this.broker.broadcast('config:changed');
            },
        },

        getEmail: {
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
            async handler() {
                const call = await this.adapter.model.findOne({key: 'call'});
                return {call: _.get(call, 'value')};
            },
        },
        setCall: {
            params: {
                call: 'object',
            },
            async handler(ctx) {
                await this.adapter.model.findOneAndUpdate({key: 'call'}, {value: ctx.params.call}, {upsert: true});
                await this.broker.broadcast('config:changed');
            },
        },

        getApps: {
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
            async handler() {
                const bot = await this.adapter.model.findOne({key: 'bot'});
                return {bot: _.get(bot, 'value')};

            },
        },
        setBot: {
            params: {
                bot: 'object',
            },
            async handler(ctx) {
                await this.adapter.model.findOneAndUpdate({key: 'bot'}, {value: ctx.params.bot}, {upsert: true});
                await this.broker.broadcast('config:changed');
            },
        },

        getCashback: {
            async handler() {
                const cashback = await this.adapter.model.findOne({key: 'cashback'});
                return {cashback: _.get(cashback, 'value')};
            },
        },
        setCashback: {
            params: {
                cashback: 'object',
            },
            async handler(ctx) {
                await this.adapter.model.findOneAndUpdate({key: 'cashback'}, {value: ctx.params.cashback}, {upsert: true});
                await this.broker.broadcast('config:changed');
            },
        },

        getSocials: {
            async handler() {
                const socials = await this.adapter.model.findOne({key: 'socials'});
                return {socials: _.get(socials, 'value', [])};

            },
        },
        setSocials: {
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
            async handler() {
                const keys = ['logo', 'icon', 'banner', 'colors'];
                const items = await this.adapter.model.find({key: {$in: keys}});
                const result = {};
                _.each(items, item => {
                    result[item.key] = _.get(item, 'value', '');
                });
                const colors = {
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

    },
    methods: {
        async update() {
            const items = await this.adapter.model.find();
            _.each(items, item => {
                _.set(this.broker.metadata, item.key, item.value);
            });
            if (!_.get(this.broker.metadata, 'authorization')) {
                _.set(this.broker.metadata, 'authorization', 'email');
            }
        }
    },
};
