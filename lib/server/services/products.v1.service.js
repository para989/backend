const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const ProductModel = require('../models/product.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;
const extractor = require('keyword-extractor');
const Morphy = require('phpmorphy');
const {removeQuestion} = require('../helpers/remove-question');
const {translitIt} = require('../helpers/translit-it');
const AuthorizeMixin = require('../mixins/authorize.mixin');

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
        'order:updated': {
            async handler(ctx) {
                await this.updateRelations(ctx);
            }
        }
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
                const words = this.morphy(_.join(phrases, ' '), ctx.params.lang);

                const set = {};
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

                const words = this.morphy(_.join(phrases, ' '), ctx.params.lang);

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
                const product = await ctx.call('v1.products.findOne', {conditions: {_id: id}});
                if (!product) {
                    throw new MoleculerServerError(ctx.meta.__('product-not-found'), 404);
                }

                await ctx.call('v1.products.deleteOne', {conditions: {_id: id}});

                await ctx.call('v1.products.updateMany', {
                    filter: {'stickers._id': id},
                    doc: {$pull: {relations: id}}
                });

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
    },
    methods: {
        morphy(string, lang) {

            let words = extractor.extract(string, {
                language: lang === 'ru' ? 'russian' : 'english',
                remove_digits: true,
                return_changed_case: true,
                remove_duplicates: true
            });

            const morphy = new Morphy(lang, {
                storage: Morphy.STORAGE_MEM,
                predict_by_suffix: true,
                predict_by_db: true,
                graminfo_as_text: true,
                use_ancodes_cache: false,
                resolve_ancodes: Morphy.RESOLVE_ANCODES_AS_TEXT
            });

            const parts = morphy.getPartOfSpeech(words, Morphy.NORMAL);

            if (_.size(parts) === 0) {
                return false;
            }

            words = [];

            for (let key in parts) {
                let arr = parts[key];
                if (typeof arr === 'object') {
                    if (arr.includes('ПРЕДЛ') || arr.includes('СОЮЗ') || arr.includes('МЕЖД') || arr.includes('ЧАСТ') || arr.includes('ВВОДН') || arr.includes('ФРАЗ')) {
                        continue;
                    }
                    words.push(key);
                }
            }

            if (words.length === 0) {
                return false;
            }

            const forms = morphy.getAllForms(words, Morphy.NORMAL);

            words = [];

            for (let key in forms) {
                let arr = forms[key];
                words.push(_.join(arr, ' '));
            }

            string = _.toLower(_.join(words, ' '));

            return string;

        },
        async updateRelations(ctx) {
            const order = ctx.params.order;
            if (_.size(order.items)) {
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
                            update: {$inc: {purchases: 1}},
                        }
                    });
                });
                if (_.size(ops)) {
                    await ctx.call('v1.products.bulkWrite', {ops});
                }
            }
            if (order.customer) {
                const ops = [];
                _.each(order.items, item => {
                    ops.push({
                        updateOne: {
                            filter: {_id: order.customer},
                            update: {$addToSet: {ordered: item.product}},
                        }
                    });
                });
                if (_.size(ops)) {
                    await ctx.call('v1.customers.bulkWrite', {ops});
                }
            }

        }
    }
};
