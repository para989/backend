const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const UserRoleModel = require('../models/user-role.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;
const AuthorizeMixin = require('../mixins/authorize.mixin');
const {translitIt} = require('../helpers/translit-it');

module.exports = {
    name: 'user-roles',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: UserRoleModel,
    hooks: {
        before: {
            '*': 'hasAccess',
        }
    },
    settings: {
        rest: '/v1',
    },
    async started() {
        const count = await this.adapter.model.countDocuments();
        if (count === 0) {
            const i18n = this.broker.metadata.i18n;
            const docs = [];
            docs.push({role: 'admin', name: i18n.__('admin'), internal: true});
            docs.push({role: 'manager', name: i18n.__('manager'), internal: true});
            docs.push({role: 'operator', name: i18n.__('operator'), internal: true});
            await this.adapter.model.insertMany(docs);
        }
    },
    events: {
        'user:counters': {
            async handler(ctx) {
                const counters = ctx.params.counters;
                const ops = [];
                _.each(counters, counter => {
                    ops.push({
                        updateOne: {
                            filter: {role: counter._id},
                            update: {count: counter.count},
                        }
                    });
                });
                if (_.size(ops)) {
                    await this.adapter.model.bulkWrite(ops);
                }
            },
        },
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
            role: 'showcase:read',
            rest: 'GET /user/roles',
            async handler() {
                return await this.adapter.model.find({}, 'id name description internal').sort('name').exec();
            }
        },
        item: {
            role: 'showcase:read',
            rest: 'GET /user/role/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {
                const id = ctx.params.id;
                const role = await this.adapter.model.findOne({_id: id}, 'id name description');
                if (!role) {
                    throw new MoleculerServerError(ctx.meta.__('role-not-found'), 404);
                }
                return role.toJSON();
            }
        },
        add: {
            role: 'showcase:write',
            rest: 'POST /user/role',
            async handler(ctx) {
                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const role = translitIt(name);
                const doc = {};
                doc.name = name;
                doc.role = role;
                if (description) {
                    doc.description = description;
                }
                await this.adapter.model.create(doc).catch(() => {
                    throw new MoleculerServerError(ctx.meta.__('role-exists'));
                });
            }
        },
        edit: {
            role: 'showcase:write',
            rest: 'PATCH /user/role',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {
                const id = ctx.params.id;
                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const set = {};
                const unset = {};
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
                await this.adapter.model.updateOne({_id: id}, doc).catch(() => {
                    throw new MoleculerServerError(ctx.meta.__('role-exists'));
                });
            }
        },
        delete: {
            role: 'showcase:write',
            rest: 'DELETE /user/role/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {
                const id = ctx.params.id;
                const role = await this.adapter.model.findOne({_id: id});
                if (!role) {
                    throw new MoleculerServerError(ctx.meta.__('role-not-found'), 404);
                }
                if (role.internal) {
                    throw new MoleculerServerError(ctx.meta.__('no-access'));
                }
                const count = await ctx.call('v1.users.countDocuments', {query: {role: role.role}});
                if (count > 0) {
                    throw new MoleculerServerError(ctx.meta.__('role-is-used'));
                }
                await this.adapter.model.deleteOne({_id: id});
                await this.broker.emit('role:deleted', {role});
                await this.broker.broadcast('content:updated');
            }
        },
        selector: {
            rest: 'GET /roles',
            cache: false,
            async handler(ctx) {
                const role = _.get(ctx.meta, 'user.role');
                const where = {};
                if (role !== 'admin') {
                    where.role = {$ne: 'admin'};
                }
                return await this.adapter.model.find(where, 'id role name count').sort('name').exec();
            }
        },
    }
};
