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
    actions: {
        get: {
            cache: false,
        },
        find: {
            cache: false,
        },
        // v1.inspections.items
        items: {
            role: 'checklists:read',
            rest: 'GET /user/inspections',
            cache: false,
            async handler(ctx) {

                const result = {
                    places: [],
                    items: [],
                };

                const _places = await ctx.call('v1.places.find');
                const places = {};
                _.each(_places, _place => {
                    const place = placeCard(_place);
                    places[_place._id.toString()] = place.address;
                    result.places.push(place);
                });

                const where = {};

                if (_.size(ctx.params.placeids)) {
                    where.place = {$in: ctx.params.placeids};
                } else if (_.size(ctx.meta.user.places)) {
                    where.place = {$in: ctx.meta.user.places};
                }

                const methods = await this.adapter.model.find(where)
                    .populate({path: 'checklist', select: 'name'})
                    .populate({path: 'place', select: 'address'})
                    .sort('-created')
                    .limit(1000)
                    .exec();

                _.each(methods, method => {
                    result.items.push({
                        inspectionid: method._id.toString(),
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

                const result = {
                    places: [],
                    checklists: [],
                };
                const indexses = {};

                const query = {};
                if (_.size(ctx.meta.user.places)) {
                    query._id = {$in: ctx.meta.user.places};
                }
                const places = await ctx.call('v1.places.find', {query, sort: 'order'});
                if (_.size(places)) {
                    _.each(places, (place, i) => {
                        indexses[place._id.toString()] = i;
                        result.places.push({placeid: place._id, name: place.address});
                    });
                } else {
                    throw new MoleculerServerError(ctx.meta.__('place-not-found'), 404);
                }

                const checklists = await ctx.call('v1.checklists.find', {query, sort: 'order'});
                if (_.size(checklists)) {
                    _.each(checklists, (checklist, i) => {
                        indexses[checklist._id.toString()] = i;
                        result.checklists.push({checklistid: checklist._id, name: checklist.name, items: checklist.items, minWeight: checklist.minWeight});
                    });
                } else {
                    throw new MoleculerServerError(ctx.meta.__('checklist-not-found'), 404);
                }

                if (inspectionid === 'new') {
                    return result;
                }

                const inspection = await ctx.call('v1.inspections.findOne', {conditions: {_id: inspectionid}});
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
            role: 'checklists:write',
            rest: 'POST /user/inspection',
            cache: false,
            async handler(ctx) {

                const checklistid = ctx.params.checklistid;
                const placeid = ctx.params.placeid;
                const description = _.trim(ctx.params.description);
                const values = ctx.params.values;
                const violations = _.parseInt(ctx.params.violations);

                const set = {};
                set.checklist = checklistid;
                set.place = placeid;
                set.user = ctx.meta.user.id;
                set.values = values;
                set.violations = violations;
                if (description) {
                    set.description = description;
                }

                await ctx.call('v1.inspections.create', set);

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
                const description = _.trim(ctx.params.description);
                const values = ctx.params.values;
                const violations = _.parseInt(ctx.params.violations);

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

                const inspection = await ctx.call('v1.inspections.findOne', {conditions: {_id: inspectionid}});
                if (!inspection) {
                    throw new MoleculerServerError(ctx.meta.__('inspection-not-found'), 404);
                }

                await ctx.call('v1.inspections.deleteOne', {conditions: {_id: inspectionid}});

            },
        }
    }
};
