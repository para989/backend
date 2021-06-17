const _ = require('lodash');
const urllib = require('urllib');
const {isTest} = require('../helpers/test');

const Queue = require('bull');
const pushNotificationsQueue = new Queue('push-notifications', {redis: global.REDIS});

module.exports = {
    name: 'push-notifications',
    version: 1,
    async started() {
        pushNotificationsQueue.process(this.notification);
    },
    actions: {
        add: {
            params: {
                title: 'string',
                message: 'string',
            },
            async handler(ctx) {
                pushNotificationsQueue.add(ctx.params, {removeOnComplete: true});
            },
        },
    },
    methods: {
        async notification(job, done) {
            const params = job.data;
            const data = {};
            data.app_id = _.get(this.broker.metadata, 'onesignal.id');
            if (params.customerid) {
                data.filters = [{field: 'tag', key: 'customerid', relation: '=', value: params.customerid}];
            } else if (params.placeid) {
                data.filters = [{field: 'tag', key: 'placeid', relation: '=', value: params.placeid}];
            }
            if (params.orderid) {
                data.data = {orderid: params.orderid};
            } else if (params.giftid) {
                data.data = {giftid: params.giftid};
            }
            data.headings = {en: params.title};
            data.contents = {en: params.message};
            data.small_icon = '@mipmap/ic_stat';
            data.android_accent_color = 'FFFF6000';
            data.large_icon = `https://${global.DOMAIN}/v1/images/image/180/icon-ios.png`;
            data.chrome_web_icon = `https://${global.DOMAIN}/v1/images/image/256/icon-ios.png`;
            const options = {};
            options.headers = {
                'Authorization': `Basic ${_.get(this.broker.metadata, 'onesignal.key')}`,
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
    },
};
