const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const TableModel = require('../models/table.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;
const AuthorizeMixin = require('../mixins/authorize.mixin');

module.exports = {
    name: 'tables',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: TableModel,
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
            role: 'places:read',
            rest: 'GET /user/tables/:placeid',
            async handler(ctx) {

                const placeid = ctx.params.placeid;

                return await this.adapter.model.find({place: placeid}, 'id name description gallery active').sort('order').exec();

            }
        },
        item: {
            role: 'places:read',
            rest: 'GET /user/table/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const table = await this.adapter.model.findOne({_id: id});
                if (!table) {
                    throw new MoleculerServerError(ctx.meta.__('table-not-found'), 404);
                }

                return table.toJSON();

            }
        },
        add: {
            role: 'places:write',
            rest: 'POST /user/table',
            async handler(ctx) {

                const placeid = ctx.params.placeid;
                const active = ctx.params.active;
                const gallery = ctx.params.gallery;
                const name = _.trim(ctx.params.name);
                const description = ctx.params.description;

                const set = {};
                set.place = placeid;
                set.active = active;
                set.gallery = gallery;
                set.name = name;
                if (description) {
                    set.description = description;
                }

                await this.adapter.model.create(set);

                await this.broker.broadcast('content:updated');

            }
        },
        edit: {
            role: 'places:write',
            rest: 'PATCH /user/table',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;
                const active = ctx.params.active;
                const gallery = ctx.params.gallery;
                const name = _.trim(ctx.params.name);
                const description = ctx.params.description;

                const set = {};
                const unset = {};
                set.active = active;
                set.gallery = gallery;
                set.name = name;
                if (description) {
                    set.description = description;
                } else {
                    unset.description = '';
                }

                const doc = {$set: set};
                if (_.size(unset)) {
                    doc.$unset = unset;
                }

                await this.adapter.model.updateOne({_id: id}, doc);

                await this.broker.broadcast('content:updated');

            }
        },
        sort: {
            role: 'places:write',
            rest: 'PUT /user/tables',
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

                await this.broker.broadcast('content:updated');

            }
        },
        delete: {
            role: 'places:write',
            rest: 'DELETE /user/table/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const table = await this.adapter.model.findOne({_id: id});
                if (!table) {
                    throw new MoleculerServerError(ctx.meta.__('table-not-found'), 404);
                }

                await this.adapter.model.deleteOne({_id: id});

                await this.broker.broadcast('content:updated');

            }
        },
    }
};
