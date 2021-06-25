const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const SupportModel = require('../models/support.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {clearPhone} = require('../helpers/phone');

module.exports = {
    name: 'support',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: SupportModel,
    actions: {
        get: {
            cache: false,
        },
        find: {
            cache: false,
        },
        send: {
            params: {
                name: {
                    type: 'string',
                },
                email: {
                    type: 'email',
                    normalize: true,
                },
                message: {
                    type: 'string',
                },
                phone: {
                    type: 'string',
                    optional: true,
                },
            },
            async handler(ctx) {

                const name = _.trim(ctx.params.name);
                const message = _.trim(ctx.params.message);
                const email = ctx.params.email;
                const phone = clearPhone(ctx.params.phone);

                const data = {name, email, phone, message};

                await ctx.call('v1.support.create', data);

                await this.broker.emit('support:created', data);

                return {ok: true};

            }
        },

    }

};
