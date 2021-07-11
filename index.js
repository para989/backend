const server = require('./lib/server');
const _ = require('lodash');

exports.start = async (options) => {
    const domain = _.get(options, 'domain');
    if (_.isEmpty(domain)) {
        console.error('Domain is required');
        process.exit(1);
    }
    global.DOMAIN = domain;
    global.MONGODB = _.get(options, 'mongodb', `mongodb://localhost:27017/${_.kebabCase(domain)}`);
    global.REDIS = _.get(options, 'redis', 'redis://localhost:6379/0');
    global.STORAGE = _.get(options, 'storage');
    global.SITE = _.get(options, 'site', false);
    global.LANG = _.get(options, 'lang', 'en');
    global.CURRENCY = _.get(options, 'currency', 'usd');
    global.SEVICES = _.get(options, 'services');
    await server.start();
};
