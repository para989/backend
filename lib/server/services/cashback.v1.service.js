const _ = require('lodash');

module.exports = {
    name: 'cashback',
    version: 1,
    events: {
        'order:updated': {
            async handler(ctx) {
                const order = ctx.params.order;
                if (order.status === 'finished') {
                    this.update(order);
                }
            }
        },
    },
    methods: {
        async update(order) {
            const i18n = this.broker.metadata.i18n;
            const active = _.get(this.broker.metadata, 'cashback.active') === true;
            const percentage = _.get(this.broker.metadata, 'cashback.percentage');
            // const maximum = _.get(this.broker.metadata, 'cashback.maximum');
            if (active) {
                const customerid = order.customer;
                const amount = Math.floor(order.amount * percentage / 100);
                await this.broker.call('v1.customer-bonuses.create', {customer: customerid, amount});
                await this.broker.call('v1.customers.updateOne', {
                    filter: {_id: customerid},
                    doc: {$inc: {bonuses: amount}}
                });
                await this.broker.call('v1.notifications.push', {
                    customerid,
                    title: i18n.__('cashback-title'),
                    message: i18n.__('cashback-message', order.name, amount),
                });
            }
        }
    },
};
