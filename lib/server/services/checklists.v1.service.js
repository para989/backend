const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const ChecklistModel = require('../models/checklist.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;
const AuthorizeMixin = require('../mixins/authorize.mixin');

module.exports = {
    name: 'checklists',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: ChecklistModel,
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
        // v1.checklists.items
        items: {
            role: 'checklists:read',
            rest: 'GET /user/checklists',
            cache: false,
            async handler(ctx) {

                const result = [];

                const methods = await ctx.call('v1.checklists.find', {sort: 'order'});
                _.each(methods, method => {
                    result.push({
                        checklistid: method._id.toString(),
                        name: method.name,
                        description: method.description,
                    });
                });

                return result;

            },
        },
        // v1.checklists.item
        item: {
            role: 'checklists:read',
            rest: 'GET /user/checklist/:checklistid',
            cache: false,
            params: {
                checklistid: 'objectID',
            },
            async handler(ctx) {

                const checklistid = ctx.params.checklistid;

                if (checklistid === 'new') {
                    return {};
                }

                const checklist = await ctx.call('v1.checklists.findOne', {conditions: {_id: checklistid}});
                if (!checklist) {
                    throw new MoleculerServerError(ctx.meta.__('checklist-not-found'), 404);
                }

                return {
                    checklistid: checklist._id.toString(),
                    name: checklist.name,
                    description: checklist.description,
                    minWeight: checklist.minWeight,
                    items: checklist.items,
                };

            },
        },
        // v1.checklists.add
        add: {
            role: 'checklists:write',
            rest: 'POST /user/checklist',
            async handler(ctx) {

                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const minWeight = _.parseInt(ctx.params.minWeight);
                const items = ctx.params.items;

                const set = {};
                set.name = name;
                set.minWeight = minWeight;
                set.items = items;
                if (description) {
                    set.description = description;
                }

                await ctx.call('v1.checklists.create', set);

            },
        },
        // v1.checklists.edit
        edit: {
            role: 'checklists:write',
            rest: 'PATCH /user/checklist',
            async handler(ctx) {

                const checklistid = ctx.params.checklistid;
                const name = _.trim(ctx.params.name);
                const minWeight = _.parseInt(ctx.params.minWeight);
                const description = _.trim(ctx.params.description);
                const items = ctx.params.items;

                const set = {};
                const unset = {};
                set.name = name;
                set.minWeight = minWeight;
                set.items = items;
                if (description) {
                    set.description = description;
                } else {
                    unset.description = '';
                }

                const doc = {$set: set};
                if (_.size(unset)) {
                    doc.$unset = unset;
                }

                await ctx.call('v1.checklists.updateOne', {filter: {_id: checklistid}, doc});

            },
        },
        // v1.checklists.sort
        sort: {
            role: 'checklists:write',
            rest: 'PUT /user/checklists',
            params: {
                ids: {
                    type: 'array',
                },
            },
            async handler(ctx) {

                const ids = ctx.params.ids;
                const ops = [];
                _.each(ids, (methodid, i) => {
                    ops.push({updateOne: {filter: {_id: methodid}, update: {order: i + 1}}});
                });

                await ctx.call('v1.checklists.bulkWrite', {ops});

            }
        },
        // v1.checklists.delete
        delete: {
            role: 'checklists:write',
            rest: 'DELETE /user/checklist/:checklistid',
            params: {
                checklistid: 'objectID',
            },
            async handler(ctx) {

                const checklistid = ctx.params.checklistid;

                const checklist = await ctx.call('v1.checklists.findOne', {conditions: {_id: checklistid}});
                if (!checklist) {
                    throw new MoleculerServerError(ctx.meta.__('checklist-not-found'), 404);
                }

                await ctx.call('v1.checklists.deleteOne', {conditions: {_id: checklistid}});

                await this.broker.emit('checklist:deleted', {checklist});

            },
        }
    }
};
