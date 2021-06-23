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
                const keys = ['name', 'organization', 'authorization', 'qrcode', 'support'];
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
                support: 'string',
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
                const support = _.trim(ctx.params.support);
                if (support) {
                    ops.push({
                        updateOne: {
                            filter: {key: 'support'},
                            update: {value: support},
                            upsert: true,
                        }
                    });
                } else {
                    ops.push({
                        deleteOne: {
                            filter: {key: 'support'},
                        }
                    });
                }
                await this.adapter.model.bulkWrite(ops);
                await this.update();
            },
        },

        getOneSignal: {
            async handler() {
                const onesignal = await this.adapter.model.findOne({key: 'onesignal'});
                return {onesignal: _.get(onesignal, 'value')};
            },
        },
        setOneSignal: {
            params: {
                onesignal: 'object',
            },
            async handler(ctx) {
                await this.adapter.model.findOneAndUpdate({key: 'onesignal'}, {value: ctx.params.onesignal}, {upsert: true});
                await this.update();
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
                await this.update();
            },
        },

        getSMTP: {
            async handler() {
                const keys = ['email', 'smtp'];
                const items = await this.adapter.model.find({key: {$in: keys}});
                const result = {};
                _.each(items, item => {
                    result[item.key] = _.get(item, 'value');
                });
                return result;
            },
        },
        setSMTP: {
            params: {
                email: 'email',
                smtp: 'object',
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
                ops.push({
                    updateOne: {
                        filter: {key: 'smtp'},
                        update: {value: ctx.params.smtp},
                        upsert: true,
                    }
                });
                await this.adapter.model.bulkWrite(ops);
                await this.update();
            },
        },

        getUcaller: {
            async handler() {
                const ucaller = await this.adapter.model.findOne({key: 'ucaller'});
                return {ucaller: _.get(ucaller, 'value')};
            },
        },
        setUcaller: {
            params: {
                ucaller: 'object',
            },
            async handler(ctx) {
                await this.adapter.model.findOneAndUpdate({key: 'ucaller'}, {value: ctx.params.ucaller}, {upsert: true});
                await this.update();
            },
        },

        getApps: {
            async handler() {
                const keys = ['ios', 'android', 'huawei'];
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
                ios: {
                    type: 'url',
                    empty: true,
                    optional: true,
                },
                android: {
                    type: 'url',
                    empty: true,
                    optional: true,
                },
                huawei: {
                    type: 'url',
                    empty: true,
                    optional: true,
                },
            },
            async handler(ctx) {
                const ops = [];
                const ios = _.trim(ctx.params.ios);
                const android = _.trim(ctx.params.android);
                const huawei = _.trim(ctx.params.huawei);
                if (ios) {
                    ops.push({
                        updateOne: {
                            filter: {key: 'ios'},
                            update: {value: ios},
                            upsert: true,
                        }
                    });
                } else {
                    ops.push({
                        deleteOne: {
                            filter: {key: 'ios'},
                        }
                    });
                }
                if (android) {
                    ops.push({
                        updateOne: {
                            filter: {key: 'android'},
                            update: {value: android},
                            upsert: true,
                        }
                    });
                } else {
                    ops.push({
                        deleteOne: {
                            filter: {key: 'android'},
                        }
                    });
                }
                if (huawei) {
                    ops.push({
                        updateOne: {
                            filter: {key: 'huawei'},
                            update: {value: huawei},
                            upsert: true,
                        }
                    });
                } else {
                    ops.push({
                        deleteOne: {
                            filter: {key: 'huawei'},
                        }
                    });
                }
                await this.adapter.model.bulkWrite(ops);
                await this.update();
            },
        },

        getTelegram: {
            async handler() {
                const telegram = await this.adapter.model.findOne({key: 'telegram'});
                return {telegram: _.get(telegram, 'value')};

            },
        },
        setTelegram: {
            params: {
                telegram: 'object',
            },
            async handler(ctx) {
                await this.adapter.model.findOneAndUpdate({key: 'telegram'}, {value: ctx.params.telegram}, {upsert: true});
                await this.update();
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
                await this.update();
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
                await this.update();
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
                await this.update();
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
                await this.update();
                await this.broker.emit('css:updated');
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
                this.broker.metadata.authorization = 'email';
            }
        }
    },
};
