const _ = require('lodash');
const urllib = require('urllib');

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

                if (config.provider === 'ucaller.ru') {

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
