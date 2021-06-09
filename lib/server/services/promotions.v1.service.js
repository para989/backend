const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const PromotionModel = require('../models/promotion.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;
const {toBrowser} = require('../helpers/delta');

module.exports = {
    name: 'promotions',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: PromotionModel,
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
                    result.places.push({placeid: place._id, name: place.name, selected: false});
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
            async handler(ctx) {

                const picture = ctx.params.picture;
                const banner = ctx.params.banner;
                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const text = _.trim(ctx.params.text);
                const placement = ctx.params.placement;
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
                if (_.size(places)) {
                    set.places = places;
                }

                await ctx.call('v1.promotions.create', set);

            }
        },
        edit: {
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
                _.each(ids, (promotionid, i) => {
                    ops.push({updateOne: {filter: {_id: promotionid}, update: {order: i + 1}}});
                });

                await ctx.call('v1.promotions.bulkWrite', {ops});

            }
        },
        delete: {
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

            }
        },
        // v1.promotions.promotions
        promotions: {
            params: {
                lang: 'string',
            },
            async handler(ctx) {

                const result = [];

                const promotions = await ctx.call('v1.promotions.find', {
                    query: {active: true},
                    sort: 'order',
                    fields: '_id name description picture banner text'
                });

                _.each(promotions, promotion => {
                    result.push({
                        id: promotion._id.toString(),
                        name: promotion.name,
                        description: promotion.description,
                        picture: promotion.picture,
                        banner: promotion.banner,
                        text: toBrowser(promotion.text),
                    });
                });

                return result;

            },
        },
    }
};