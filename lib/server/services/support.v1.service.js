const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const SupportModel = require('../models/support.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;
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
            rest: false,
            cache: false,
        },
        find: {
            cache: false,
        },
        list: {
            rest: false,
            cache: false,
        },
        create: {
            rest: false,
        },
        update: {
            rest: false,
        },
        remove: {
            rest: false,
        },
        items: {
            role: 'support:read',
            rest: 'GET /user/support',
            async handler(ctx) {

                const type = ctx.params.type;

                const result = [];

                const where = {};
                if (type === 'user') {
                    where.type = 'user';
                } else {
                    where.type = {$in: ['place', 'product']};
                }

                const items = await this.adapter.model.find({})
                    .sort('-created')
                    .limit(1000)
                    .exec();

                _.each(items, item => {
                    result.push({
                        id: item.id,
                        author: {
                            name: item.name,
                            email: item.email,
                            phone: item.phone,
                        },
                        message: item.message,
                        created: item.created,
                    });
                });

                return result;

            }
        },
        delete: {
            role: 'support:write',
            rest: 'DELETE /user/support/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const support = await this.adapter.model.findOne({_id: id});
                if (!support) {
                    throw new MoleculerServerError(ctx.meta.__('support-not-found'), 404);
                }

                await this.adapter.model.deleteOne({_id: id});

            }
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

                await this.broker.emit('support:created', {support: data});

                return {ok: true};

            }
        },

    }

};
