const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const InspectionModel = require('../models/inspection.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {placeCard} = require('../helpers/place');
const {MoleculerServerError} = require('moleculer').Errors;
const AuthorizeMixin = require('../mixins/authorize.mixin');

module.exports = {
    name: 'inspections',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: InspectionModel,
    hooks: {
        before: {
            '*': 'hasAccess',
        }
    },
    settings: {
        rest: '/v1',
    },
    events: {
        'checklist:deleted': {
            async handler(ctx) {
                const checklist = ctx.params.checklist;
                await this.adapter.model.deleteMany({checklist: checklist._id});
            }
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
        // v1.inspections.items
        items: {
            role: 'checklists:read',
            rest: 'GET /user/inspections',
            cache: false,
            async handler(ctx) {

                const places = await ctx.call('v1.places.selector');

                const result = {
                    places,
                    items: [],
                };

                const where = {};

                if (_.size(ctx.params.placeids)) {
                    where.place = {$in: ctx.params.placeids};
                } else if (_.size(ctx.meta.user.places)) {
                    where.place = {$in: ctx.meta.user.places};
                }

                const methods = await this.adapter.model.find(where)
                    .populate({path: 'checklist', select: 'name'})
                    .populate({path: 'place', select: 'address'})
                    .populate({path: 'author', select: 'name phone email avatar'})
                    .sort('-created')
                    .limit(1000)
                    .exec();

                _.each(methods, method => {
                    result.items.push({
                        inspectionid: method._id.toString(),
                        author: method.author,
                        description: method.description,
                        violations: method.violations,
                        created: method.created,
                        place: method.place.address,
                        checklist: method.checklist.name,
                    });
                });

                return result;

            },
        },
        // v1.inspections.item
        item: {
            role: 'checklists:read',
            rest: 'GET /user/inspection/:inspectionid',
            cache: false,
            params: {
                inspectionid: 'objectID',
            },
            async handler(ctx) {

                const inspectionid = ctx.params.inspectionid;

                const places = await ctx.call('v1.places.selector');
                if (_.size(places) === 0) {
                    throw new MoleculerServerError(ctx.meta.__('place-not-found'), 404);
                }

                const checklists = await ctx.call('v1.checklists.selector');
                if (_.size(checklists) === 0) {
                    throw new MoleculerServerError(ctx.meta.__('checklist-not-found'), 404);
                }

                const result = {
                    places,
                    checklists,
                };

                const query = {};
                if (_.size(ctx.meta.user.places)) {
                    query._id = {$in: ctx.meta.user.places};
                }

                if (inspectionid === 'new') {
                    return result;
                }

                const inspection = await ctx.call('v1.inspections.findOne', {query: {_id: inspectionid}});
                if (!inspection) {
                    throw new MoleculerServerError(ctx.meta.__('inspection-not-found'), 404);
                }

                result.inspectionid = inspection._id.toString();
                result.placeid = inspection.place.toString();
                result.checklistid = inspection.checklist.toString();
                result.name = inspection.name;
                result.description = inspection.description;
                result.values = inspection.values;

                return result;

            },
        },
        // v1.inspections.add
        add: {
            rest: 'POST /(customer|user)/inspection',
            cache: false,
            async handler(ctx) {

                const type = ctx.params[0];

                const customerid = ctx.params.customerid;
                const checklistid = ctx.params.checklistid;
                const placeid = ctx.params.placeid;
                const values = ctx.params.values;

                const description = _.trim(ctx.params.description);

                let violations = 0;
                _.each(values, value => {
                    violations += value.violations;
                });

                let customer
                if (type === 'customer') {
                    customer = await ctx.call('v1.customers.findOne', {query: {_id: customerid}});
                    if (!customer) {
                        throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                    }
                }

                const set = {};
                set.type = type;
                set.checklist = checklistid;
                set.place = placeid;
                set.author = customer ? customer._id : ctx.meta.user.id;
                set.values = values;
                set.violations = violations;
                if (description) {
                    set.description = description;
                }

                const inspection = await ctx.call('v1.inspections.create', set);

                if (customer) {
                    await this.broker.emit('inspection:created', {inspection, customer});
                }

            },
        },
        // v1.inspections.edit
        edit: {
            role: 'checklists:write',
            rest: 'PATCH /user/inspection',
            cache: false,
            async handler(ctx) {

                const inspectionid = ctx.params.inspectionid;
                const checklistid = ctx.params.checklistid;
                const placeid = ctx.params.placeid;
                const values = ctx.params.values;

                const description = _.trim(ctx.params.description);

                let violations = 0;
                _.each(values, value => {
                    violations += value.violations;
                });

                const set = {};
                const unset = {};
                set.checklist = checklistid;
                set.place = placeid;
                set.values = values;
                set.violations = violations;
                if (description) {
                    set.description = description;
                } else {
                    unset.description = '';
                }

                const doc = {$set: set};
                if (_.size(unset)) {
                    doc.$unset = unset;
                }

                await ctx.call('v1.inspections.updateOne', {filter: {_id: inspectionid}, doc});

            },
        },
        // v1.inspections.delete
        delete: {
            role: 'checklists:write',
            rest: 'DELETE /user/inspection/:inspectionid',
            cache: false,
            params: {
                inspectionid: 'objectID',
            },
            async handler(ctx) {

                const inspectionid = ctx.params.inspectionid;

                const inspection = await ctx.call('v1.inspections.findOne', {query: {_id: inspectionid}});
                if (!inspection) {
                    throw new MoleculerServerError(ctx.meta.__('inspection-not-found'), 404);
                }

                await ctx.call('v1.inspections.deleteOne', {query: {_id: inspectionid}});

                await this.broker.emit('inspection:deleted', {inspection});

            },
        }
    }
};
