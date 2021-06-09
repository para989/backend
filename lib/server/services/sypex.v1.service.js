const _ = require('lodash');
const SxGeo = require('../helpers/sxgeo');
const {isTest} = require("../helpers/test");
const sxGeo = new SxGeo(`${__dirname}/../assets/data/SxGeoCity.dat`);

module.exports = {
    name: 'sypex',
    version: 1,
    actions: {
        city(ctx) {
            let ip = ctx.params.ip;
            ip = _.replace(ip, '::ffff:', '');
            if (isTest()) {
                ip = '178.218.103.195';
            }
            return sxGeo.get(ip);
        }
    }
};
