const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const DomainModel = require('../models/domain.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;
const AuthorizeMixin = require('../mixins/authorize.mixin');

module.exports = {
    name: 'domains',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: DomainModel,
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
            await this.adapter.model.create({domain: global.DOMAIN});
        }
    },
    actions: {
        get: {
            rest: false,
            cache: true,
        },
        find: {
            cache: true,
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
            role: 'settings:read',
            rest: 'GET /user/domains',
            async handler(ctx) {

                const search = ctx.params.search;
                const result = [];

                const domains = await ctx.call('v1.domains.find', {
                    search,
                    searchFields: 'domain',
                    sort: 'domain'
                });

                _.each(domains, domain => {
                    result.push({
                        domainid: domain._id,
                        domain: domain.domain,
                    });
                });

                return result;

            }
        },
        item: {
            role: 'settings:read',
            rest: 'GET /user/domain/:domainid',
            params: {
                domainid: 'objectID',
            },
            async handler(ctx) {

                const domainid = ctx.params.domainid;

                const domain = await ctx.call('v1.domains.findOne', {query: {_id: domainid}});
                if (!domain) {
                    throw new MoleculerServerError(ctx.meta.__('domain-not-found'), 404);
                }

                return {
                    domainid: domain._id,
                    domain: domain.domain,
                    content: domain.content,
                };

            }
        },
        add: {
            role: 'settings:write',
            rest: 'POST /user/domain',
            async handler(ctx) {

                const domain = _.toLower(_.trim(ctx.params.domain));
                const content = ctx.params.content;

                const set = {};
                set.domain = domain;
                if (_.size(content)) {
                    set.content = content;
                }

                await ctx.call('v1.domains.create', set).catch(() => {
                    throw new MoleculerServerError(ctx.meta.__('domain-exists'));
                });

                await this.clean();

            }
        },
        edit: {
            role: 'settings:write',
            rest: 'PATCH /user/domain',
            params: {
                domainid: 'objectID',
            },
            async handler(ctx) {

                const domainid = ctx.params.domainid;
                const domain = _.toLower(_.trim(ctx.params.domain));
                const content = ctx.params.content;

                const set = {};
                const unset = {};
                set.domain = domain;
                if (_.size(content)) {
                    set.content = content;
                } else {
                    unset.content = '';
                }

                const doc = {$set: set};
                if (_.size(unset)) {
                    doc.$unset = unset;
                }

                await ctx.call('v1.domains.updateOne', {filter: {_id: domainid}, doc}).catch(() => {
                    throw new MoleculerServerError(ctx.meta.__('domain-exists'));
                });

                await this.clean();

            }
        },
        delete: {
            role: 'settings:write',
            rest: 'DELETE /user/domain/:domainid',
            params: {
                domainid: 'objectID',
            },
            async handler(ctx) {

                const domainid = ctx.params.domainid;

                const domain = await ctx.call('v1.domains.findOne', {query: {_id: domainid}});
                if (!domain) {
                    throw new MoleculerServerError(ctx.meta.__('domain-not-found'), 404);
                }

                if (domain.domain === global.DOMAIN) {
                    throw new MoleculerServerError(ctx.meta.__('global-domain'));
                }

                await ctx.call('v1.domains.deleteOne', {query: {_id: domainid}});

                await this.broker.emit('domain:deleted', {domain});

                await this.clean();

            }
        },
    },
    methods: {
        async clean() {
            await this.broker.cacher.clean('v1.domains.**');
        }
    }
};
