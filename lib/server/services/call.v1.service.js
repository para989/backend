const _ = require('lodash');

module.exports = {
    name: 'call',
    version: 1,
    events: {
        'code:created': {
            async handler(ctx) {

                if (_.get(this.broker.metadata, 'authorization') !== 'call') {
                    return;
                }

                const name = ctx.params.name;
                const code = ctx.params.code;

                const i18n = this.broker.metadata.i18n;



            }
        },
    },
    actions: {

    }
};
