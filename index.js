const server = require('./lib/server');
const _ = require('lodash');

exports.start = (options) => {
    const domain = _.get(options, 'domain');
    if (_.isEmpty(domain)) {
        console.error('Domain is required');
        process.exit(1);
    }
    global.DOMAIN = domain;
    global.MONGODB = _.get(options, 'mongodb', `mongodb://localhost/${_.kebabCase(domain)}`);
    global.REDIS = _.get(options, 'redis', {
        host: 'localhost',
        port: 6379
    });
    global.STORAGE = _.get(options, 'storage');
    global.SITE = _.get(options, 'site', false);
    server.start();
};