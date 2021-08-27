const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const ProductModel = require('../models/product.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;
const {removeQuestion} = require('../helpers/remove-question');
const {translitIt} = require('../helpers/translit-it');
const AuthorizeMixin = require('../mixins/authorize.mixin');
const {morphy} = require('../helpers/morphy');

module.exports = {
    name: 'products',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: ProductModel,
    hooks: {
        before: {
            '*': 'hasAccess',
        }
    },
    settings: {
        rest: '/v1',
    },
    events: {
        'order:created': {
            async handler(ctx) {
                const order = ctx.params.order;
                const ops = [];
                _.each(order.items, item1 => {
                    const id1 = item1.product;
                    _.each(order.items, item2 => {
                        const id2 = item2.product;
                        if (id1 !== id2) {
                            ops.push({
                                updateOne: {
                                    filter: {_id: id1},
                                    update: {$addToSet: {relations: id2}},
                                }
                            });
                        }
                    });
                    ops.push({
                        updateOne: {
                            filter: {_id: id1},
                            update: {$inc: {purchases: item1.quantity}},
                        }
                    });
                });
                if (_.size(ops)) {
                    await this.adapter.model.bulkWrite(ops);
                }
            }
        },
        'review:created': {
            async handler(ctx) {
                const review = ctx.params.review;
                if (review.type === 'product') {
                    const $inc = {};
                    $inc[`rating.${review.rating - 1}`] = 1;
                    await this.adapter.model.updateOne({_id: review.object}, {$inc});
                }
            },
        },
        'sticker:deleted': {
            async handler(ctx) {
                const sticker = ctx.params.sticker;
                await this.adapter.model.updateMany({'stickers._id': sticker._id}, {$pull: {stickers: {_id: sticker._id}}});
            }
        },
        'ingredient:deleted': {
            async handler(ctx) {
                const ingredient = ctx.params.ingredient;
                await this.adapter.model.updateMany({ingredients: ingredient._id}, {$pull: {ingredients: {_id: ingredient._id}}});
            }
        },
        'brand:deleted': {
            async handler(ctx) {
                const brand = ctx.params.brand;
                await this.adapter.model.updateMany({brand: brand._id}, {$unset: {brand: ''}});
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
        item: {
            role: 'showcase:read',
            rest: 'GET /user/product/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const result = {};

                result.cashbackEnabled = _.get(this.broker.metadata, 'cashback.active') === true;

                result.places = await ctx.call('v1.places.selector');
                result.groups = await ctx.call('v1.groups.selector');
                result.modifiers = await ctx.call('v1.modifiers.selector');
                result.ingredients = await ctx.call('v1.ingredients.selector');
                result.stickers = await ctx.call('v1.stickers.selector');
                result.brands = await ctx.call('v1.brands.selector');

                if (id === 'new') {
                    return result;
                }

                const product = await this.adapter.model.findOne({_id: id});
                if (!product) {
                    throw new MoleculerServerError(ctx.meta.__('product-not-found'), 404);
                }

                result.product = product.toJSON();

                return result;

            }
        },
        add: {
            role: 'showcase:write',
            rest: 'POST /user/product',
            async handler(ctx) {

                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const url = ctx.params.url || translitIt(name);
                const active = ctx.params.active === true;
                const hit = ctx.params.hit === true;
                const additional = ctx.params.additional === true;
                const places = ctx.params.places;
                const prices = ctx.params.prices;
                const groups = ctx.params.groups;
                const modifiers = ctx.params.modifiers;
                const ingredients = ctx.params.ingredients;
                const brand = ctx.params.brand;

                const stickers = [];
                if (_.size(ctx.params.stickers)) {
                    _.each(ctx.params.stickers, (sticker) => {
                        stickers.push({_id: sticker.id, name: sticker.name, color: sticker.color});
                    });
                }

                const gallery = ctx.params.gallery;
                const time = Math.ceil(new Date().getTime() / 1000);
                _.each(gallery, (item) => {
                    item.picture = removeQuestion(item.picture);
                    item.picture += '?' + time;
                });

                const phrases = [];
                phrases.push(name);
                if (description) {
                    phrases.push(description);
                }
                const words = morphy(_.join(phrases, ' '), ctx.params.lang);

                const set = {rating: [0, 0, 0, 0, 0]};
                if (words) {
                    set.words = words;
                }
                set.gallery = gallery;
                set.name = name;
                if (description) {
                    set.description = description;
                }
                set.url = url;
                set.groups = groups;
                if (_.size(places)) {
                    set.places = places;
                }
                if (_.size(modifiers)) {
                    set.modifiers = modifiers;
                }
                if (_.size(ingredients)) {
                    set.ingredients = ingredients;
                }
                if (_.size(stickers)) {
                    set.stickers = stickers;
                }
                set.prices = prices;
                set.active = active;
                if (hit) {
                    set.hit = hit;
                }
                if (additional) {
                    set.additional = additional;
                }
                if (brand) {
                    set.brand = brand;
                }

                await ctx.call('v1.products.create', set).catch(() => {
                    throw new MoleculerServerError(ctx.meta.__('url-is-used'));
                });

                await this.broker.broadcast('content:updated');

            }
        },
        edit: {
            role: 'showcase:write',
            rest: 'PATCH /user/product',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;
                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const url = ctx.params.url || translitIt(name);
                const active = ctx.params.active === true;
                const hit = ctx.params.hit === true;
                const additional = ctx.params.additional === true;
                const places = ctx.params.places;
                const prices = ctx.params.prices;
                const groups = ctx.params.groups;
                const modifiers = ctx.params.modifiers;
                const ingredients = ctx.params.ingredients;
                const brand = ctx.params.brand;

                const stickers = [];
                if (_.size(ctx.params.stickers)) {
                    _.each(ctx.params.stickers, (sticker) => {
                        stickers.push({_id: sticker.id, name: sticker.name, color: sticker.color});
                    });
                }

                const gallery = ctx.params.gallery;
                const time = Math.ceil(new Date().getTime() / 1000);
                _.each(gallery, (item) => {
                    item.picture = removeQuestion(item.picture);
                    item.picture += '?' + time;
                });

                const phrases = [];
                phrases.push(name);
                if (description) {
                    phrases.push(description);
                }

                const words = morphy(_.join(phrases, ' '), ctx.params.lang);

                const set = {};
                const unset = {};
                if (words) {
                    set.words = words;
                } else {
                    unset.words = '';
                }
                set.gallery = gallery;
                set.name = name;
                if (description) {
                    set.description = description;
                } else {
                    unset.description = '';
                }
                set.url = url;
                set.groups = groups;
                if (_.size(places)) {
                    set.places = places;
                } else {
                    unset.places = '';
                }
                if (_.size(modifiers)) {
                    set.modifiers = modifiers;
                } else {
                    unset.modifiers = '';
                }
                if (_.size(ingredients)) {
                    set.ingredients = ingredients;
                } else {
                    unset.ingredients = '';
                }
                if (_.size(stickers)) {
                    set.stickers = stickers;
                } else {
                    unset.stickers = '';
                }
                set.prices = prices;
                set.active = active;
                if (additional) {
                    set.additional = additional;
                } else {
                    unset.additional = '';
                }
                if (hit) {
                    set.hit = hit;
                } else {
                    unset.hit = '';
                }
                if (brand) {
                    set.brand = brand;
                } else {
                    unset.brand = '';
                }

                const doc = {$set: set};
                if (_.size(unset)) {
                    doc.$unset = unset;
                }
                await ctx.call('v1.products.updateOne', {filter: {_id: id}, doc}).catch(() => {
                    throw new MoleculerServerError(ctx.meta.__('url-is-used'));
                });

                await this.broker.broadcast('content:updated');

            }
        },
        sort: {
            role: 'showcase:write',
            rest: 'PUT /user/products/sort',
            params: {
                ids: {
                    type: 'array',
                },
            },
            async handler(ctx) {

                const ids = ctx.params.ids;
                const ops = [];
                _.each(ids, (groupid, i) => {
                    ops.push({updateOne: {filter: {_id: groupid}, update: {order: i + 1}}});
                });

                await ctx.call('v1.products.bulkWrite', {ops});

                await this.broker.broadcast('content:updated');

            }
        },
        delete: {
            role: 'showcase:write',
            rest: 'DELETE /user/product/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;
                const product = await ctx.call('v1.products.findOne', {query: {_id: id}});
                if (!product) {
                    throw new MoleculerServerError(ctx.meta.__('product-not-found'), 404);
                }

                await ctx.call('v1.products.deleteOne', {query: {_id: id}});

                await this.broker.emit('product:deleted', {product});

                await this.broker.broadcast('content:updated');

            }
        },
        selector: {
            rest: 'GET /products',
            cache: false,
            async handler(ctx) {
                return await this.adapter.model.find({}, 'id name gallery').sort('order').exec();
            }
        },
        popular: {
            rest: 'GET /products/popular',
            cache: true,
            async handler(ctx) {
                const products = await this.adapter.model.find({active: true}, 'id name purchases').sort('-purchases').limit(10).exec();
                const items = [];
                _.each(products, product => {
                    items.push({id: product.id, name: product.name, purchases: product.purchases});
                });
                return items;
            }
        },
    },
};
