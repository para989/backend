const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const PromotionModel = require('../models/promotion.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {promotionCard} = require('../helpers/promotion');
const {MoleculerServerError} = require('moleculer').Errors;
const AuthorizeMixin = require('../mixins/authorize.mixin');

module.exports = {
    name: 'promotions',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: PromotionModel,
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
        items: {
            role: 'marketing:read',
            rest: 'GET /user/promotions',
            async handler(ctx) {

                const search = ctx.params.search;
                const result = [];

                const promotions = await ctx.call('v1.promotions.find', {search, searchFields: 'name', sort: 'order'});
                _.each(promotions, promotion => {
                    result.push({
                        promotionid: promotion._id,
                        name: promotion.name,
                        placement: promotion.placement,
                        picture: promotion.picture,
                        banner: promotion.banner,
                        description: promotion.description,
                        active: promotion.active,
                    });
                });

                return result;

            }
        },
        item: {
            role: 'marketing:read',
            rest: 'GET /user/promotion/:promotionid',
            params: {
                promotionid: 'objectID',
            },
            async handler(ctx) {

                const promotionid = ctx.params.promotionid;

                const result = {
                    places: [],
                };
                const indexses = {};

                const places = await ctx.call('v1.places.find', {sort: 'order'});
                _.each(places, (place, i) => {
                    indexses[place._id.toString()] = i;
                    result.places.push({placeid: place._id, name: place.address, selected: false});
                });

                if (promotionid === 'new') {
                    return result;
                }

                const promotion = await ctx.call('v1.promotions.findOne', {conditions: {_id: promotionid}});
                if (!promotion) {
                    throw new MoleculerServerError(ctx.meta.__('promotion-not-found'), 404);
                }

                result.promotionid = promotion._id;
                result.picture = promotion.picture;
                result.banner = promotion.banner;
                result.name = promotion.name;
                result.description = promotion.description;
                result.text = promotion.text;
                result.placement = promotion.placement;
                result.content = promotion.content;
                result.active = promotion.active;

                _.each(promotion.places, placeid => {
                    placeid = placeid.toString();
                    if (indexses[placeid] !== undefined) {
                        const index = indexses[placeid];
                        result.places[index].selected = true;
                    }
                });

                return result;

            }
        },
        add: {
            role: 'marketing:write',
            rest: 'POST /user/promotion',
            async handler(ctx) {

                const picture = ctx.params.picture;
                const banner = ctx.params.banner;
                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const text = _.trim(ctx.params.text);
                const placement = ctx.params.placement;
                const content = ctx.params.content;
                const active = ctx.params.active === true;
                const places = ctx.params.places;

                const set = {};
                set.picture = picture;
                set.banner = banner;
                set.name = name;
                set.description = description;
                set.text = text;
                set.placement = placement;
                set.active = active;
                if (_.size(content)) {
                    set.content = content;
                }
                if (_.size(places)) {
                    set.places = places;
                }

                await ctx.call('v1.promotions.create', set);

                await this.broker.broadcast('content:updated');

            }
        },
        edit: {
            role: 'marketing:write',
            rest: 'PATCH /user/promotion',
            params: {
                promotionid: 'objectID',
            },
            async handler(ctx) {

                const promotionid = ctx.params.promotionid;
                const picture = ctx.params.picture;
                const banner = ctx.params.banner;
                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const text = _.trim(ctx.params.text);
                const placement = ctx.params.placement;
                const content = ctx.params.content;
                const active = ctx.params.active === true;
                const places = ctx.params.places;

                const set = {};
                const unset = {};
                set.picture = picture;
                set.banner = banner;
                set.name = name;
                set.description = description;
                set.text = text;
                set.placement = placement;
                set.active = active;
                if (_.size(content)) {
                    set.content = content;
                } else {
                    unset.content = '';
                }
                if (_.size(places)) {
                    set.places = places;
                } else {
                    unset.places = '';
                }

                const doc = {$set: set};
                if (_.size(unset)) {
                    doc.$unset = unset;
                }

                await ctx.call('v1.promotions.updateOne', {filter: {_id: promotionid}, doc});

                await this.broker.broadcast('content:updated');

            }
        },
        sort: {
            role: 'marketing:write',
            rest: 'PUT /user/promotions',
            params: {
                ids: {
                    type: 'array',
                },
            },
            async handler(ctx) {

                const ids = ctx.params.ids;
                const ops = [];
                _.each(ids, (promotionid, i) => {
                    ops.push({updateOne: {filter: {_id: promotionid}, update: {order: i + 1}}});
                });

                await ctx.call('v1.promotions.bulkWrite', {ops});

                await this.broker.broadcast('content:updated');

            }
        },
        delete: {
            role: 'marketing:write',
            rest: 'DELETE /user/promotion/:promotionid',
            params: {
                promotionid: 'objectID',
            },
            async handler(ctx) {

                const promotionid = ctx.params.promotionid;

                const promotion = await ctx.call('v1.promotions.findOne', {conditions: {_id: promotionid}});
                if (!promotion) {
                    throw new MoleculerServerError(ctx.meta.__('promotion-not-found'), 404);
                }

                await ctx.call('v1.promotions.deleteOne', {conditions: {_id: promotionid}});

                await this.broker.broadcast('content:updated');

            }
        },
        // v1.promotions.promotions
        promotions: {
            rest: 'GET /customer/promotions',
            async handler(ctx) {

                const result = [];

                const promotions = await ctx.call('v1.promotions.find', {query: {active: true}, sort: 'order'});

                _.each(promotions, promotion => {
                    result.push(promotionCard(promotion));
                });

                return result;

            },
        },
    }
};
