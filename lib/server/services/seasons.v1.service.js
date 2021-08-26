const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const SeasonModel = require('../models/season.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;
const AuthorizeMixin = require('../mixins/authorize.mixin');

module.exports = {
    name: 'seasons',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: SeasonModel,
    hooks: {
        before: {
            '*': 'hasAccess',
        }
    },
    settings: {
        rest: '/v1',
    },
    events: {
        'season:purchased': {
            async handler(ctx) {
                const season = ctx.params.season;
                await this.adapter.model.updateOne({_id: season._id}, {$inc: {purchases: 1}});
            },
        },
        'review:created': {
            async handler(ctx) {
                const review = ctx.params.review;
                if (review.type === 'season') {
                    const $inc = {};
                    $inc[`rating.${review.rating - 1}`] = 1;
                    await this.adapter.model.updateOne({_id: review.object}, {$inc});
                }
            },
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
        items: {
            role: 'marketing:read',
            rest: 'GET /user/seasons',
            async handler(ctx) {
                return await this.adapter.model.find({}, 'id name placement picture description active').sort('order').exec();
            }
        },
        item: {
            role: 'marketing:read',
            rest: 'GET /user/season/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const result = {
                    places: [],
                    products: [],
                };

                result.places = await ctx.call('v1.places.selector');

                result.products = await ctx.call('v1.products.selector');
                if (_.size(result.products) === 0) {
                    throw new MoleculerServerError(ctx.meta.__('add-products'), 404);
                }

                if (id === 'new') {
                    return result;
                }

                const season = await this.adapter.model.findOne({_id: id});
                if (!season) {
                    throw new MoleculerServerError(ctx.meta.__('season-not-found'), 404);
                }

                result.season = season.toJSON();

                return result;

            }
        },
        add: {
            role: 'marketing:write',
            rest: 'POST /user/season',
            async handler(ctx) {

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

                const set = {rating: [0, 0, 0, 0, 0]};
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
            role: 'marketing:write',
            rest: 'PATCH /user/season',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;
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

                await ctx.call('v1.seasons.updateOne', {filter: {_id: id}, doc});

                await this.broker.broadcast('content:updated');

            }
        },
        sort: {
            role: 'marketing:write',
            rest: 'PUT /user/seasons',
            params: {
                ids: {
                    type: 'array',
                },
            },
            async handler(ctx) {

                const ids = ctx.params.ids;
                const ops = [];
                _.each(ids, (id, i) => {
                    ops.push({updateOne: {filter: {_id: id}, update: {order: i + 1}}});
                });

                await ctx.call('v1.seasons.bulkWrite', {ops});

                await this.broker.broadcast('content:updated');

            }
        },
        delete: {
            role: 'marketing:write',
            rest: 'DELETE /user/season/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const season = await ctx.call('v1.seasons.findOne', {query: {_id: id}});
                if (!season) {
                    throw new MoleculerServerError(ctx.meta.__('season-not-found'), 404);
                }

                await ctx.call('v1.seasons.deleteOne', {query: {_id: id}});

                await this.broker.emit('season:deleted', {season});

                await this.broker.broadcast('content:updated');

            }
        },
        selector: {
            rest: 'GET /seasons',
            cache: false,
            async handler(ctx) {
                return await this.adapter.model.find({}, 'id name').sort('order').exec();
            }
        },
        popular: {
            rest: 'GET /seasons/popular',
            cache: true,
            async handler(ctx) {
                const seasons = await this.adapter.model.find({active: true}, 'id name purchases').sort('-purchases').limit(10).exec();
                const items = [];
                _.each(seasons, season => {
                    items.push({id: season.id, name: season.name, purchases: season.purchases});
                });
                return items;
            }
        },
    }
};
