const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const BrandModel = require('../models/brand.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;
const AuthorizeMixin = require('../mixins/authorize.mixin');

module.exports = {
    name: 'brands',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: BrandModel,
    hooks: {
        before: {
            '*': 'hasAccess',
        }
    },
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
            role: 'brands:read',
            rest: 'GET /user/brands',
            async handler(ctx) {
                return await this.adapter.model.find({}, 'id name picture description').sort('order').exec();
            }
        },
        item: {
            role: 'brands:read',
            rest: 'GET /user/brand/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const result = {};

                if (id === 'new') {
                    return result;
                }

                const brand = await this.adapter.model.findOne({_id: id});
                if (!brand) {
                    throw new MoleculerServerError(ctx.meta.__('brand-not-found'), 404);
                }

                result.brand = brand.toJSON();

                return result;

            }
        },
        add: {
            role: 'brands:write',
            rest: 'POST /user/brand',
            async handler(ctx) {

                const picture = ctx.params.picture;
                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);

                const set = {};
                set.picture = picture;
                set.name = name;
                set.description = description;

                await this.adapter.model.create(set);

                await this.broker.broadcast('content:updated');

            }
        },
        edit: {
            role: 'brands:write',
            rest: 'PATCH /user/brand',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;
                const picture = ctx.params.picture;
                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);

                const set = {};
                const unset = {};
                set.picture = picture;
                set.name = name;
                set.description = description;

                const doc = {$set: set};
                if (_.size(unset)) {
                    doc.$unset = unset;
                }

                await this.adapter.model.updateOne({_id: id}, doc);

                return {id};

            }
        },
        sort: {
            role: 'brands:write',
            rest: 'PUT /user/brands',
            params: {
                ids: {
                    type: 'array',
                },
            },
            async handler(ctx) {

                const ids = ctx.params.ids;
                const ops = [];
                _.each(ids, (id, i) => {
                    ops.push({updateOne: {filter: {_id: id}, update: {order: i + 1}}});
                });

                await this.adapter.model.bulkWrite(ops);

            }
        },
        delete: {
            role: 'brands:write',
            rest: 'DELETE /user/brand/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const brand = await this.adapter.model.findOne({_id: id});
                if (!brand) {
                    throw new MoleculerServerError(ctx.meta.__('brand-not-found'), 404);
                }

                await this.adapter.model.deleteOne({_id: id});

                await this.broker.emit('brand:deleted', {brand});

            }
        },
        selector: {
            rest: 'GET /brands',
            cache: false,
            async handler(ctx) {
                return await this.adapter.model.find({}, 'id name').sort('order').exec();
            }
        },
    },
};
