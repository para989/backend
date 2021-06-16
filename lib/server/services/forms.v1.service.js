const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const FormModel = require('../models/form.model');
const MongooseMixin = require('../mixins/mongoose.mixin');

module.exports = {
    name: 'forms',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: FormModel,
    actions: {
        get: {
            cache: false,
        },
        find: {
            cache: false,
        },
        // v1.forms.item
        item: {
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
