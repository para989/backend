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
            params: {
                lang: 'string',
            },
            async handler(ctx) {
                const units = await ctx.call('v1.units.get', {language: ctx.params.lang});
                const colors = await ctx.call('v1.colors.get', {language: ctx.params.lang});
                return {units, colors};
            },
        },
        getBasic: {
            async handler() {
                const keys = ['name', 'description', 'organization', 'domain', 'authorization', 'qrcode'];
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
                description: 'string',
                organization: 'string',
                domain: 'string',
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
                ops.push({
                    updateOne: {
                        filter: {key: 'description'},
                        update: {value: _.trim(ctx.params.description)},
                        upsert: true,
                    }
                });
                ops.push({
                    updateOne: {
                        filter: {key: 'organization'},
                        update: {value: _.trim(ctx.params.organization)},
                        upsert: true,
                    }
                });
                ops.push({
                    updateOne: {
                        filter: {key: 'domain'},
                        update: {value: _.trim(ctx.params.domain)},
                        upsert: true,
                    }
                });
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
                        filter: {key: 'object'},
                        update: {value: ctx.params.object},
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

        getStorage: {
            async handler() {
                const storage = await this.adapter.model.findOne({key: 'storage'});
                return {storage: _.get(storage, 'value')};
            },
        },
        setStorage: {
            params: {
                storage: 'object',
            },
            async handler(ctx) {
                await this.adapter.model.findOneAndUpdate({key: 'storage'}, {value: ctx.params.storage}, {upsert: true});
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

    },
    methods: {
        async update() {
            const items = await this.adapter.model.find();
            _.each(items, item => {
                _.set(this.broker.metadata, item.key, item.value);
            });
        }
    },
};
