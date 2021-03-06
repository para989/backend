const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const AgreementModel = require('../models/agreement.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;
const AuthorizeMixin = require('../mixins/authorize.mixin');

module.exports = {
    name: 'agreements',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: AgreementModel,
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
            role: 'content:read',
            rest: 'GET /user/agreements',
            async handler(ctx) {

                const search = ctx.params.search;
                const result = [];

                const agreements = await ctx.call('v1.agreements.find', {
                    search,
                    searchFields: 'name',
                    sort: 'order'
                });

                _.each(agreements, agreement => {
                    result.push({
                        agreementid: agreement._id,
                        name: agreement.name,
                    });
                });

                return result;

            }
        },
        item: {
            role: 'content:read',
            rest: 'GET /user/agreement/:agreementid',
            params: {
                agreementid: 'objectID',
            },
            async handler(ctx) {

                const agreementid = ctx.params.agreementid;

                const agreement = await ctx.call('v1.agreements.findOne', {query: {_id: agreementid}});
                if (!agreement) {
                    throw new MoleculerServerError(ctx.meta.__('agreement-not-found'), 404);
                }

                return {
                    agreementid: agreement._id,
                    name: agreement.name,
                    text: agreement.text,
                };

            }
        },
        add: {
            role: 'content:write',
            rest: 'POST /user/agreement',
            async handler(ctx) {

                const name = _.trim(ctx.params.name);
                const text = ctx.params.text;

                const set = {};
                set.name = name;
                set.text = text;

                await ctx.call('v1.agreements.create', set);

                await this.broker.broadcast('content:updated');

            }
        },
        edit: {
            role: 'content:write',
            rest: 'PATCH /user/agreement',
            params: {
                agreementid: 'objectID',
            },
            async handler(ctx) {

                const agreementid = ctx.params.agreementid;
                const name = _.trim(ctx.params.name);
                const text = _.trim(ctx.params.text);

                const set = {};
                set.name = name;
                set.text = text;

                const doc = {$set: set};

                await ctx.call('v1.agreements.updateOne', {filter: {_id: agreementid}, doc});

                await this.broker.broadcast('content:updated');

            }
        },
        sort: {
            role: 'content:write',
            rest: 'PUT /user/agreements',
            params: {
                ids: {
                    type: 'array',
                },
            },
            async handler(ctx) {

                const ids = ctx.params.ids;
                const ops = [];
                _.each(ids, (agreementid, i) => {
                    ops.push({updateOne: {filter: {_id: agreementid}, update: {order: i + 1}}});
                });

                await ctx.call('v1.agreements.bulkWrite', {ops});

                await this.broker.broadcast('content:updated');

            }
        },
        delete: {
            role: 'content:write',
            rest: 'DELETE /user/agreement/:agreementid',
            params: {
                agreementid: 'objectID',
            },
            async handler(ctx) {

                const agreementid = ctx.params.agreementid;

                const agreement = await ctx.call('v1.agreements.findOne', {query: {_id: agreementid}});
                if (!agreement) {
                    throw new MoleculerServerError(ctx.meta.__('agreement-not-found'), 404);
                }

                await ctx.call('v1.agreements.deleteOne', {query: {_id: agreementid}});

                await this.broker.emit('agreement:deleted', {agreement});

                await this.broker.broadcast('content:updated');

            }
        },
        // v1.agreements.agreement
        agreement: {
            rest: 'GET /customer/agreement/:agreementid',
            params: {
                agreementid: 'objectID',
            },
            async handler(ctx) {

                const agreementid = ctx.params.agreementid;

                const agreement = await ctx.call('v1.agreements.findOne', {query: {_id: agreementid}});
                if (!agreement) {
                    throw new MoleculerServerError(ctx.meta.__('agreement-not-found'), 404);
                }

                return {
                    id: agreement._id.toString(),
                    name: agreement.name,
                    text: agreement.text,
                };

            },
        },
    }
};
