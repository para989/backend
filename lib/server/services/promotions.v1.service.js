const _ = require('lodash');
const mongoose = require('mongoose');
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
            rest: 'GET /user/promotions',
            async handler(ctx) {
                return await this.adapter.model.find({}, 'id name placement picture banner description active').sort('order').exec();
            }
        },
        item: {
            role: 'marketing:read',
            rest: 'GET /user/promotion/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const result = {};

                result.places = await ctx.call('v1.places.selector');
                result.groups = await ctx.call('v1.groups.selector');
                result.products = await ctx.call('v1.products.selector');
                result.seasons = await ctx.call('v1.seasons.selector');
                result.gifts = await ctx.call('v1.gifts.selector');

                if (id === 'new') {
                    return result;
                }

                const promotion = await this.adapter.model.findOne({_id: id});
                if (!promotion) {
                    throw new MoleculerServerError(ctx.meta.__('promotion-not-found'), 404);
                }

                result.promotion = promotion.toJSON();

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
                set.placement = placement;
                set.active = active;
                if (text) {
                    set.text = text;
                }
                if (_.size(content)) {
                    if (content.type !== 'link') {
                        content.value = mongoose.Types.ObjectId(content.value);
                    }
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
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;
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
                set.placement = placement;
                set.active = active;
                if (text) {
                    set.text = text;
                } else {
                    unset.text = '';
                }
                if (_.size(content)) {
                    if (content.type !== 'link') {
                        content.value = mongoose.Types.ObjectId(content.value);
                    }
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

                await ctx.call('v1.promotions.updateOne', {filter: {_id: id}, doc});

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
                _.each(ids, (id, i) => {
                    ops.push({updateOne: {filter: {_id: id}, update: {order: i + 1}}});
                });

                await ctx.call('v1.promotions.bulkWrite', {ops});

                await this.broker.broadcast('content:updated');

            }
        },
        delete: {
            role: 'marketing:write',
            rest: 'DELETE /user/promotion/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const promotion = await ctx.call('v1.promotions.findOne', {conditions: {_id: id}});
                if (!promotion) {
                    throw new MoleculerServerError(ctx.meta.__('promotion-not-found'), 404);
                }

                await ctx.call('v1.promotions.deleteOne', {conditions: {_id: id}});

                await this.broker.emit('promotion:deleted', {promotion});

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
                    if (_.isEmpty(promotion.content)) {
                        result.push(promotionCard(promotion));
                    }
                });
                return result;
            },
        },
        selector: {
            rest: 'GET /promotions',
            cache: false,
            async handler(ctx) {
                return await this.adapter.model.find({}, 'id name').sort('order').exec();
            }
        },
    }
};
