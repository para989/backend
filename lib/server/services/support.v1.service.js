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
    settings: {
        rest: '/v1',
    },
    actions: {
        get: {
            cache: false,
        },
        find: {
            cache: false,
        },
        send: {
            rest: 'POST /customer/support',
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
                placeid: {
                    type: 'objectID',
                    optional: true,
                },
                from: {
                    type: 'string',
                    enum: ['app', 'site'],
                    default: 'app',
                },
            },
            async handler(ctx) {

                const name = _.trim(ctx.params.name);
                const message = _.trim(ctx.params.message);
                const email = ctx.params.email;
                const phone = clearPhone(ctx.params.phone);
                const from = ctx.params.from;
                const placeid = ctx.params.placeid;

                const data = {name, email, phone, message, from};
                if (placeid) {
                    const place = await ctx.call('v1.places.get', {id: placeid, fields: '_id address'});
                    if (place) {
                        data.address = place.address;
                        data.place = placeid;
                    }
                }

                await ctx.call('v1.support.create', data);

                await this.broker.emit('support:created', data);

                return {ok: true};

            }
        },

    }

};
