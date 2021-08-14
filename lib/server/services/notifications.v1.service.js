const _ = require('lodash');
const urllib = require('urllib');
const {isTest} = require('../helpers/test');
const mongoose = require('mongoose');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const NotificationModel = require('../models/notification.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;
const AuthorizeMixin = require('../mixins/authorize.mixin');
const {notificationCard} = require('../helpers/notification');
const zlib = require('zlib');
const parse = require('csv-parse/lib/sync');

const Queue = require('bull');
const {formatISO} = require("date-fns");
const sendNotificationsQueue = new Queue('send-notifications', {redis: global.REDIS});
const exportNotificationsQueue = new Queue('export-notifications', {redis: global.REDIS});
const importNotificationsQueue = new Queue('import-notifications', {redis: global.REDIS});

module.exports = {
    name: 'notifications',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: NotificationModel,
    hooks: {
        before: {
            '*': 'hasAccess',
        }
    },
    settings: {
        rest: '/v1',
    },
    async created() {
        sendNotificationsQueue.process(this.notification);
        exportNotificationsQueue.process(this.export);
        importNotificationsQueue.process(this.import);
    },
    async started() {
        await this.broker.waitForServices(['v1.config']);
        exportNotificationsQueue.add({}, {repeat: {cron: '0 0 * * *'}, removeOnComplete: true});
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
        items: {
            role: 'marketing:read',
            rest: 'GET /user/notifications',
            async handler(ctx) {
                return await this.adapter.model.find({}, 'id name placement picture description active').sort('order').exec();
            }
        },
        item: {
            role: 'marketing:read',
            rest: 'GET /user/notification/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const result = {};

                result.places = await ctx.call('v1.places.selector');
                result.groups = await ctx.call('v1.groups.selector');
                result.products = await ctx.call('v1.products.selector');
                result.seasons = await ctx.call('v1.seasons.selector');
                result.gifts = await ctx.call('v1.gifts.selector');
                result.promotions = await ctx.call('v1.promotions.selector');

                if (id === 'new') {
                    return result;
                }

                const notification = await this.adapter.model.findOne({_id: id});
                if (!notification) {
                    throw new MoleculerServerError(ctx.meta.__('notification-not-found'), 404);
                }

                result.notification = notification.toJSON();

                return result;

            }
        },
        add: {
            role: 'marketing:write',
            rest: 'POST /user/notification',
            async handler(ctx) {

                const picture = ctx.params.picture;
                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const placement = ctx.params.placement;
                const content = ctx.params.content;
                const active = ctx.params.active === true;
                const places = ctx.params.places;

                const set = {};
                set.picture = picture;
                set.name = name;
                set.description = description;
                set.placement = placement;
                set.active = active;
                if (_.size(content)) {
                    if (content.type !== 'link') {
                        content.value = mongoose.Types.ObjectId(content.value);
                    }
                    set.content = content;
                }
                if (_.size(places)) {
                    set.places = places;
                }

                const notification = await this.adapter.model.create(set);

                return {id: notification.id};

            }
        },
        edit: {
            role: 'marketing:write',
            rest: 'PATCH /user/notification',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;
                const picture = ctx.params.picture;
                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const placement = ctx.params.placement;
                const content = ctx.params.content;
                const active = ctx.params.active === true;
                const places = ctx.params.places;

                const set = {};
                const unset = {};
                set.picture = picture;
                set.name = name;
                set.description = description;
                set.placement = placement;
                set.active = active;
                if (_.size(content)) {
                    if (content.type !== 'link') {
                        content.value = mongoose.Types.ObjectId(content.value);
                    }
                    set.content = content;
                } else {
                    unset.content = '';
                }
                if (_.size(places)) {
                    set.places = places;
                } else {
                    unset.places = '';
                }

                const doc = {$set: set};
                if (_.size(unset)) {
                    doc.$unset = unset;
                }

                await this.adapter.model.updateOne({_id: id}, doc);

                return {id};

            }
        },
        sort: {
            role: 'marketing:write',
            rest: 'PUT /user/notifications',
            params: {
                ids: {
                    type: 'array',
                },
            },
            async handler(ctx) {

                const ids = ctx.params.ids;
                const ops = [];
                _.each(ids, (id, i) => {
                    ops.push({updateOne: {filter: {_id: id}, update: {order: i + 1}}});
                });

                await this.adapter.model.bulkWrite(ops);

            }
        },
        delete: {
            role: 'marketing:write',
            rest: 'DELETE /user/notification/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const notification = await this.adapter.model.findOne({_id: id});
                if (!notification) {
                    throw new MoleculerServerError(ctx.meta.__('notification-not-found'), 404);
                }

                await this.adapter.model.deleteOne({_id: id});

                await this.broker.emit('notification:deleted', {notification});

            }
        },
        send: {
            role: 'marketing:write',
            rest: 'POST /user/notification/send',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const notification = await this.adapter.model.findOne({_id: id});
                if (!notification) {
                    throw new MoleculerServerError(ctx.meta.__('notification-not-found'), 404);
                }

                const params = {
                    title: notification.name,
                    message: notification.description,
                    picture: notification.picture,
                    placement: notification.placement,
                    content: {
                        type: 'notification',
                        value: notificationCard(notification.toJSON()),
                    },
                };

                if (_.size(notification.places)) {
                    _.each(notification.places, placeid => {
                        params.storeid = placeid;
                        sendNotificationsQueue.add(params, {removeOnComplete: true});
                    });
                } else {
                    sendNotificationsQueue.add(params, {removeOnComplete: true});
                }

            }
        },
        push: {
            params: {
                title: 'string',
                message: 'string',
            },
            async handler(ctx) {
                sendNotificationsQueue.add(ctx.params, {removeOnComplete: true});
            },
        },
    },
    methods: {
        async notification(job, done) {
            const id = _.get(this.broker.metadata, 'notification.id');
            if (!id) {
                return done();
            }
            const params = job.data;
            const data = {};
            data.app_id = id;
            const filters = [];
            if (params.customerid) {
                filters.push({field: 'tag', key: 'customerid', relation: '=', value: params.customerid});
            } else if (params.storeid) {
                filters.push({field: 'tag', key: 'storeid', relation: '=', value: params.storeid});
            } else if (params.placeid) {
                filters.push({field: 'tag', key: 'placeid', relation: '=', value: params.placeid});
            }
            switch (params.placement) {
                case 'app':
                    filters.push({field: 'tag', key: 'placement', relation: '=', value: 'app'});
                    break;
                case 'site':
                    filters.push({field: 'tag', key: 'placement', relation: '=', value: 'site'});
                    break;
            }
            if (_.size(filters)) {
                data.filters = filters;
            } else {
                data.included_segments = ['Subscribed Users'];
            }
            if (params.orderid) {
                data.data = {
                    type: 'order',
                    value: {
                        id: params.orderid,
                    },
                };
            } else if (params.giftid) {
                data.data = {
                    type: 'gift',
                    value: {
                        id: params.giftid,
                    },
                };
            } else if (params.content) {
                data.data = params.content;
            }
            data.headings = {en: params.title};
            data.contents = {en: params.message};
            data.small_icon = '@mipmap/ic_stat';
            // data.android_accent_color = 'FFFF6000';
            const icon = _.get(this.broker.metadata, 'icon');
            if (icon) {
                data.large_icon = `https://${global.DOMAIN}/v1/images/image/180/${icon}`;
                data.chrome_web_icon = `https://${global.DOMAIN}/v1/images/image/256/${icon}`;
            }
            if (params.picture) {
                const picture = `https://${global.DOMAIN}/v1/images/banner/512/${params.picture}`;
                data.big_picture = picture;
                data.huawei_big_picture = picture;
                data.chrome_web_image = picture;
                data.adm_big_picture = picture;
                data.chrome_big_picture = picture;
            }
            const options = {};
            options.headers = {
                'Authorization': `Basic ${_.get(this.broker.metadata, 'notification.key')}`,
                'Content-Type': 'application/json; charset=utf-8'
            };
            options.method = 'POST';
            options.dataType = 'json';
            options.data = data;
            options.timeout = 60000;
            const res = await urllib.request('https://onesignal.com/api/v1/notifications', options);
            if (isTest()) {
                console.log(res.data);
            }
            done();
        },
        async export(job, done) {
            const id = _.get(this.broker.metadata, 'notification.id');
            if (!id) {
                return done();
            }
            const options = {};
            options.headers = {
                'Authorization': `Basic ${_.get(this.broker.metadata, 'notification.key')}`,
                'Content-Type': 'application/json; charset=utf-8'
            };
            options.method = 'POST';
            options.dataType = 'json';
            options.timeout = 60000;
            const res = await urllib.request(`https://onesignal.com/api/v1/players/csv_export?app_id=${id}`, options);
            const file = _.get(res.data, 'csv_file_url');
            if (file) {
                importNotificationsQueue.add({file}, {delay: 10000, removeOnComplete: true});
            }
        },
        async import(job, done) {
            const file = job.data.file;
            const res = await urllib.request(file);
            const str = zlib.unzipSync(res.data).toString();
            const records = parse(str, {columns: true, skip_empty_lines: true});
            const data = {};
            _.each(records, record => {
                const date = formatISO(new Date(record.created_at), {representation: 'date'});
                if (!data[date]) {
                    data[date] = {ios: 0, android: 0, site: 0};
                }
                switch (record.device_type) {
                    case '0':
                        data[date].ios += 1;
                        break;
                    case '1':
                        data[date].android += 1;
                        break;
                    default:
                        data[date].site += 1;
                        break;
                }
            });
            await this.broker.emit('platforms:updated', {data});
            done();
        },
    },
};
