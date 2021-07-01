const _ = require('lodash');
const urllib = require('urllib');
const {isTest} = require('../helpers/test');
const {customAlphabet} = require('nanoid');
const nanoid = customAlphabet('0123456789', 4);

module.exports = {
    name: 'call',
    version: 1,
    events: {
        'code:created': {
            async handler(ctx) {

                const phone = ctx.params.phone;
                const config = _.get(this.broker.metadata, 'call');

                if (_.get(this.broker.metadata, 'authorization') !== 'call' || !phone || !_.size(config)) {
                    return;
                }

                if (isTest()) {

                    const code = nanoid();

                    await this.broker.cacher.client.set(phone, code);

                    console.log(phone, code);

                } else if (config.provider === 'ucaller.ru') {

                    const params = {};
                    params.service_id = config.id;
                    params.key = config.key;
                    params.phone = phone;
                    const response = await urllib.request('https://api.ucaller.ru/v1.0/initCall', {
                        method: 'GET',
                        data: params,
                        dataType: 'json',
                    });
                    if (response.data.code) {
                        await this.broker.cacher.client.set(phone, response.data.code);
                    }

                }

            }
        },
    },
};
