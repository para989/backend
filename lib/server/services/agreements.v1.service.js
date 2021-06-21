const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const AgreementModel = require('../models/agreement.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;

module.exports = {
    name: 'agreements',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: AgreementModel,
    actions: {
        get: {
            cache: false,
        },
        find: {
            cache: false,
        },
        items: {
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
            params: {
                agreementid: 'objectID',
            },
            async handler(ctx) {

                const agreementid = ctx.params.agreementid;

                const agreement = await ctx.call('v1.agreements.findOne', {conditions: {_id: agreementid}});
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
            async handler(ctx) {

                const name = _.trim(ctx.params.name);
                const text = ctx.params.text;

                const set = {};
                set.name = name;
                set.text = text;

                await ctx.call('v1.agreements.create', set);

                await this.broker.emit('content:updated');

            }
        },
        edit: {
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

                await this.broker.emit('content:updated');

            }
        },
        sort: {
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

                await this.broker.emit('content:updated');

            }
        },
        delete: {
            params: {
                agreementid: 'objectID',
            },
            async handler(ctx) {

                const agreementid = ctx.params.agreementid;

                const agreement = await ctx.call('v1.agreements.findOne', {conditions: {_id: agreementid}});
                if (!agreement) {
                    throw new MoleculerServerError(ctx.meta.__('agreement-not-found'), 404);
                }

                await ctx.call('v1.agreements.deleteOne', {conditions: {_id: agreementid}});

                await this.broker.emit('content:updated');

            }
        },
        // v1.agreements.agreement
        agreement: {
            params: {
                agreementid: 'objectID',
            },
            async handler(ctx) {

                const agreementid = ctx.params.agreementid;

                const agreement = await ctx.call('v1.agreements.findOne', {conditions: {_id: agreementid}});
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
