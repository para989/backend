const _ = require('lodash');

module.exports = {
    name: 'ip',
    version: 1,
    settings: {
        rest: '/v1',
    },
    actions: {
        // v1.ip.get
        get: {
            rest: 'GET /ip',
            cache: false,
            async handler(ctx) {
                return {ip: _.replace(ctx.meta.ip, '::ffff:', '')};
            },
        },
    }
};
