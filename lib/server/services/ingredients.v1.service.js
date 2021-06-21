const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const IngredientModel = require('../models/ingredient.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;

module.exports = {
    name: 'ingredients',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: IngredientModel,
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

                const ingredients = await ctx.call('v1.ingredients.find', {
                    search,
                    searchFields: 'name',
                    sort: 'order'
                });

                _.each(ingredients, ingredient => {
                    result.push({
                        ingredientid: ingredient._id,
                        name: ingredient.name,
                        allergen: ingredient.allergen,
                    });
                });

                return result;

            }
        },
        item: {
            params: {
                ingredientid: 'objectID',
            },
            async handler(ctx) {

                const ingredientid = ctx.params.ingredientid;

                const ingredient = await ctx.call('v1.ingredients.findOne', {conditions: {_id: ingredientid}});
                if (!ingredient) {
                    throw new MoleculerServerError(ctx.meta.__('ingredient-not-found'), 404);
                }

                return {
                    ingredientid: ingredient._id,
                    name: ingredient.name,
                    allergen: ingredient.allergen,
                };

            }
        },
        add: {
            async handler(ctx) {

                const name = _.trim(ctx.params.name);
                const allergen = ctx.params.allergen;

                const set = {};
                set.name = name;
                set.allergen = allergen;

                await ctx.call('v1.ingredients.create', set);

                await this.broker.emit('content:updated');

            }
        },
        edit: {
            params: {
                ingredientid: 'objectID',
            },
            async handler(ctx) {

                const ingredientid = ctx.params.ingredientid;
                const name = _.trim(ctx.params.name);
                const allergen = ctx.params.allergen;

                const set = {};
                set.name = name;
                set.allergen = allergen;

                const doc = {$set: set};

                await ctx.call('v1.ingredients.updateOne', {filter: {_id: ingredientid}, doc});

                await this.broker.emit('content:updated');

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
                _.each(ids, (ingredientid, i) => {
                    ops.push({updateOne: {filter: {_id: ingredientid}, update: {order: i + 1}}});
                });

                await ctx.call('v1.ingredients.bulkWrite', {ops});

                await this.broker.emit('content:updated');

            }
        },
        delete: {
            params: {
                ingredientid: 'objectID',
            },
            async handler(ctx) {

                const ingredientid = ctx.params.ingredientid;

                const ingredient = await ctx.call('v1.ingredients.findOne', {conditions: {_id: ingredientid}});
                if (!ingredient) {
                    throw new MoleculerServerError(ctx.meta.__('ingredient-not-found'), 404);
                }

                const doc = {$pull: {ingredients: {_id: ingredientid}}};

                await ctx.call('v1.products.updateOne', {filter: {ingredients: ingredientid}, doc});

                await ctx.call('v1.ingredients.deleteOne', {conditions: {_id: ingredientid}});

                await this.broker.emit('content:updated');

            }
        },
    }
};
