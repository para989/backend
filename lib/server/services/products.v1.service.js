const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const ProductModel = require('../models/product.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;
const extractor = require('keyword-extractor');
const Morphy = require('phpmorphy');
const {removeQuestion} = require("../helpers/remove-question");
const {translitIt} = require('../helpers/translit-it');

module.exports = {
    name: 'products',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: ProductModel,
    events: {
        'order:updated': {
            async handler(ctx) {
                await this.updateRelations(ctx);
            }
        }
    },
    actions: {
        get: {
            cache: false,
        },
        find: {
            cache: false,
        },
        item: {
            params: {
                productid: 'objectID',
            },
            async handler(ctx) {

                const productid = ctx.params.productid;

                const result = {
                    groups: [],
                    modifiers: [],
                    ingredients: [],
                    stickers: [],
                };
                const indexses = {};

                const stickers = await ctx.call('v1.stickers.find', {fields: '_id name url color', sort: 'order'});
                _.each(stickers, (sticker, i) => {
                    indexses[sticker._id.toString()] = i;
                    result.stickers.push({
                        stickerid: sticker._id,
                        name: sticker.name,
                        url: sticker.url,
                        color: sticker.color,
                        selected: false
                    });
                });

                const modifiers = await ctx.call('v1.modifiers.find', {fields: '_id name', sort: 'order'});
                _.each(modifiers, (modifier, i) => {
                    indexses[modifier._id.toString()] = i;
                    result.modifiers.push({modifierid: modifier._id, name: modifier.name, selected: false});
                });

                const ingredients = await ctx.call('v1.ingredients.find', {fields: '_id name', ort: 'order'});
                _.each(ingredients, (ingredient, i) => {
                    indexses[ingredient._id.toString()] = i;
                    result.ingredients.push({ingredientid: ingredient._id, name: ingredient.name, selected: false});
                });

                const groups = await ctx.call('v1.groups.find', {fields: '_id name', sort: 'order'});
                _.each(groups, (group, i) => {
                    indexses[group._id.toString()] = i;
                    result.groups.push({groupid: group._id, name: group.name, selected: false});
                });

                result.cashbackEnabled = _.get(this.broker.metadata, 'cashback.active') === true;

                if (productid === 'new') {
                    return result;
                }

                const product = await ctx.call('v1.products.get', {id: productid});
                if (!product) {
                    throw new MoleculerServerError(ctx.meta.__('product-not-found'), 404);
                }

                result.productid = product._id.toString();
                result.gallery = product.gallery;
                result.name = product.name;
                result.description = product.description;
                result.url = product.url;
                result.prices = product.prices;
                result.active = product.active;
                result.hit = product.hit;
                result.additional = product.additional;

                _.each(product.stickers, sticker => {
                    const stickerid = sticker._id.toString();
                    if (indexses[stickerid] !== undefined) {
                        const index = indexses[stickerid];
                        result.stickers[index].selected = true;
                    }
                });

                _.each(product.modifiers, modifierid => {
                    modifierid = modifierid.toString();
                    if (indexses[modifierid] !== undefined) {
                        const index = indexses[modifierid];
                        result.modifiers[index].selected = true;
                    }
                });

                _.each(product.ingredients, ingredientid => {
                    ingredientid = ingredientid.toString();
                    if (indexses[ingredientid] !== undefined) {
                        const index = indexses[ingredientid];
                        result.ingredients[index].selected = true;
                    }
                });

                _.each(product.groups, groupid => {
                    groupid = groupid.toString();
                    if (indexses[groupid] !== undefined) {
                        const index = indexses[groupid];
                        result.groups[index].selected = true;
                    }
                });

                return result;

            }
        },
        add: {
            async handler(ctx) {

                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const url = ctx.params.url || translitIt(name);
                const active = ctx.params.active === true;
                const hit = ctx.params.hit === true;
                const additional = ctx.params.additional === true;

                const prices = ctx.params.prices;
                const groups = ctx.params.groups;
                const modifiers = ctx.params.modifiers;
                const ingredients = ctx.params.ingredients;

                const stickers = [];
                if (_.size(ctx.params.stickers)) {
                    _.each(ctx.params.stickers, (sticker) => {
                        stickers.push({
                            _id: sticker.stickerid,
                            name: sticker.name,
                            color: sticker.color,
                            url: sticker.url
                        });
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

                await this.broker.emit('catalog:updated');

            }
        },
        edit: {
            params: {
                productid: 'objectID',
            },
            async handler(ctx) {

                const productid = ctx.params.productid;
                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const url = ctx.params.url || translitIt(name);
                const active = ctx.params.active === true;
                const hit = ctx.params.hit === true;
                const additional = ctx.params.additional === true;

                const prices = ctx.params.prices;
                const groups = ctx.params.groups;
                const modifiers = ctx.params.modifiers;
                const ingredients = ctx.params.ingredients;

                const stickers = [];
                if (_.size(ctx.params.stickers)) {
                    _.each(ctx.params.stickers, (sticker) => {
                        stickers.push({
                            _id: sticker.stickerid,
                            name: sticker.name,
                            color: sticker.color,
                            url: sticker.url
                        });
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
                await ctx.call('v1.products.updateOne', {filter: {_id: productid}, doc}).catch(() => {
                    throw new MoleculerServerError(ctx.meta.__('url-is-used'));
                });

                await this.broker.emit('catalog:updated');

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
                _.each(ids, (groupid, i) => {
                    ops.push({updateOne: {filter: {_id: groupid}, update: {order: i + 1}}});
                });

                await ctx.call('v1.products.bulkWrite', {ops});

            }
        },
        delete: {
            params: {
                productid: 'objectID',
            },
            async handler(ctx) {

                const productid = ctx.params.productid;
                const product = await ctx.call('v1.products.findOne', {conditions: {_id: productid}});
                if (!product) {
                    throw new MoleculerServerError(ctx.meta.__('product-not-found'), 404);
                }

                await ctx.call('v1.products.deleteOne', {conditions: {_id: productid}});

                await ctx.call('v1.products.updateMany', {
                    filter: {'stickers._id': productid},
                    doc: {$pull: {relations: productid}}
                });

                await this.broker.emit('catalog:updated', {user: product.user});

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
            if (_.size(ctx.params.items)) {
                const ops = [];
                _.each(ctx.params.items, item1 => {
                    const productid1 = item1.product;
                    _.each(ctx.params.items, item2 => {
                        const productid2 = item2.product;
                        if (productid1 !== productid2) {
                            ops.push({
                                updateOne: {
                                    filter: {_id: productid1},
                                    update: {$addToSet: {relations: productid2}},
                                }
                            });
                        }
                    });
                    ops.push({
                        updateOne: {
                            filter: {_id: productid1},
                            update: {$inc: {purchases: 1}},
                        }
                    });
                });
                if (_.size(ops)) {
                    await ctx.call('v1.products.bulkWrite', {ops});
                }
            }
            if (ctx.params.customer) {
                const ops = [];
                _.each(ctx.params.items, item => {
                    ops.push({
                        updateOne: {
                            filter: {_id: ctx.params.customer},
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
