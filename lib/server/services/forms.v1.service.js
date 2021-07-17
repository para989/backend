const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const FormModel = require('../models/form.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const AuthorizeMixin = require('../mixins/authorize.mixin');

module.exports = {
    name: 'forms',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: FormModel,
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
        // v1.forms.item
        item: {
            role: 'forms:read',
            rest: 'GET /user/form/:type',
            cache: false,
            params: {
                type: 'string',
            },
            async handler(ctx) {
                const type = ctx.params.type;
                const item = await this.adapter.model.findOne({type});
                return _.get(item, 'items', []);
            },
        },
        // v1.forms.edit
        edit: {
            role: 'forms:write',
            rest: 'PATCH /user/form',
            cache: false,
            params: {
                type: 'string',
                items: 'array',
            },
            async handler(ctx) {
                const type = ctx.params.type;
                const items = ctx.params.items;
                await this.adapter.model.updateOne({type}, {type, items}, {upsert: true});
            },
        },
        // v1.forms.delete
        delete: {
            role: 'forms:write',
            rest: 'DELETE /user/form/:type',
            cache: false,
            params: {
                type: 'string',
            },
            async handler(ctx) {
                const type = ctx.params.type;
                await this.adapter.model.deleteOne({type});
            },
        }
    }
};
