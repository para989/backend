const _ = require('lodash');
const urllib = require('urllib');

const {customAlphabet} = require('nanoid');
const nanoid = customAlphabet('0123456789', 4);

module.exports = {
    name: 'sms',
    version: 1,
    events: {
        'code:created': {
            async handler(ctx) {

                const customer = ctx.params.customer;
                const phone = customer.phone;
                const config = _.get(this.broker.metadata, 'sms');

                const i18n = this.broker.metadata.i18n;
                const code = nanoid();
                const message = `${i18n.__('code-title')}: ${code} (${global.DOMAIN})`;

                if (_.get(this.broker.metadata, 'authorization') !== 'sms' || !phone || !_.size(config)) {
                    return;
                }

                if (config.provider === 'sms.ru') {

                    const params = {};
                    params.api_id = config.key;
                    params.to = phone;
                    params.text = message;
                    params.json = 1;
                    const response = await urllib.request('https://sms.ru/sms/send', {
                        method: 'POST',
                        data: params,
                        dataType: 'json',
                    });

                    if (response.data.status === 'OK') {
                        await this.broker.cacher.client.set(phone, code);
                    }

                } else if (config.provider === 'twilio.com') {

                    const client = require('twilio')(config.id, config.key);

                    const response = await client.messages.create({
                        body: message,
                        from: 'AUTH',
                        to: `+${phone}`,
                    });

                    if (response.status === 'queued') {
                        await this.broker.cacher.client.set(phone, code);
                    }

                }

            }
        },
    },
};
