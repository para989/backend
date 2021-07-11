const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const SeasonModel = require('../models/season.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;

module.exports = {
    name: 'seasons',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: SeasonModel,
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

                const seasons = await ctx.call('v1.seasons.find', {search, searchFields: 'name', sort: 'order'});
                _.each(seasons, season => {
                    result.push({
                        seasonid: season._id,
                        name: season.name,
                        placement: season.placement,
                        picture: season.picture,
                        description: season.description,
                        active: season.active,
                    });
                });

                return result;

            }
        },
        item: {
            params: {
                seasonid: 'objectID',
            },
            async handler(ctx) {

                const seasonid = ctx.params.seasonid;

                const result = {
                    places: [],
                    products: [],
                };
                const indexses = {};

                const places = await ctx.call('v1.places.find', {sort: 'order'});
                _.each(places, (place, i) => {
                    indexses[place._id.toString()] = i;
                    result.places.push({placeid: place._id, name: place.address, selected: false});
                });

                const products = await ctx.call('v1.products.find', {sort: 'order'});
                _.each(products, (product, i) => {
                    indexses[product._id.toString()] = i;
                    result.products.push({productid: product._id, name: product.name, selected: false});
                });

                if (_.size(products) === 0) {
                    throw new MoleculerServerError(ctx.meta.__('add-products'), 404);
                }

                if (seasonid === 'new') {
                    return result;
                }

                const season = await ctx.call('v1.seasons.findOne', {conditions: {_id: seasonid}});
                if (!season) {
                    throw new MoleculerServerError(ctx.meta.__('season-not-found'), 404);
                }

                result.seasonid = season._id;
                result.picture = season.picture;
                result.name = season.name;
                result.description = season.description;
                result.placement = season.placement;
                result.duration = season.duration;
                result.price = season.price;
                result.amount = season.amount;
                result.active = season.active;

                _.each(season.places, placeid => {
                    placeid = placeid.toString();
                    if (indexses[placeid] !== undefined) {
                        const index = indexses[placeid];
                        result.places[index].selected = true;
                    }
                });

                _.each(season.products, productid => {
                    productid = productid.toString();
                    if (indexses[productid] !== undefined) {
                        const index = indexses[productid];
                        result.products[index].selected = true;
                    }
                });

                return result;

            }
        },
        add: {
            async handler(ctx) {

                const count = await this.adapter.model.countDocuments();
                if (count > 0) {
                    throw new MoleculerServerError(ctx.meta.__('already-added'));
                }

                const picture = ctx.params.picture;
                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const placement = ctx.params.placement;
                const duration = ctx.params.duration;
                const price = ctx.params.price;
                const amount = ctx.params.amount;
                const active = ctx.params.active === true;
                const places = ctx.params.places;
                const products = ctx.params.products;

                const set = {};
                set.picture = picture;
                set.name = name;
                set.description = description;
                set.placement = placement;
                set.duration = duration;
                set.price = price;
                set.amount = amount;
                set.active = active;
                if (_.size(places)) {
                    set.places = places;
                }
                if (_.size(products)) {
                    set.products = products;
                }

                await ctx.call('v1.seasons.create', set);

                await this.broker.broadcast('content:updated');

            }
        },
        edit: {
            params: {
                seasonid: 'objectID',
            },
            async handler(ctx) {

                const seasonid = ctx.params.seasonid;
                const picture = ctx.params.picture;
                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const placement = ctx.params.placement;
                const duration = ctx.params.duration;
                const price = ctx.params.price;
                const amount = ctx.params.amount;
                const active = ctx.params.active === true;
                const places = ctx.params.places;
                const products = ctx.params.products;

                const set = {};
                const unset = {};
                set.picture = picture;
                set.name = name;
                set.description = description;
                set.placement = placement;
                set.duration = duration;
                set.price = price;
                set.amount = amount;
                set.active = active;
                if (_.size(places)) {
                    set.places = places;
                } else {
                    unset.places = '';
                }
                if (_.size(products)) {
                    set.products = products;
                } else {
                    unset.products = '';
                }

                const doc = {$set: set};
                if (_.size(unset)) {
                    doc.$unset = unset;
                }

                await ctx.call('v1.seasons.updateOne', {filter: {_id: seasonid}, doc});

                await this.broker.broadcast('content:updated');

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
                _.each(ids, (seasonid, i) => {
                    ops.push({updateOne: {filter: {_id: seasonid}, update: {order: i + 1}}});
                });

                await ctx.call('v1.seasons.bulkWrite', {ops});

                await this.broker.broadcast('content:updated');

            }
        },
        delete: {
            params: {
                seasonid: 'objectID',
            },
            async handler(ctx) {

                const seasonid = ctx.params.seasonid;

                const season = await ctx.call('v1.seasons.findOne', {conditions: {_id: seasonid}});
                if (!season) {
                    throw new MoleculerServerError(ctx.meta.__('season-not-found'), 404);
                }

                await ctx.call('v1.seasons.deleteOne', {conditions: {_id: seasonid}});

                await ctx.call('v1.customer-seasons.deleteMany', {conditions: {season: seasonid}});

                await this.broker.broadcast('content:updated');

            }
        },
    }
};
