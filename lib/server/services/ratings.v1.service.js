const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const RatingModel = require('../models/rating.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {formatISO} = require('date-fns');

module.exports = {
    name: 'ratings',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: RatingModel,
    hooks: {
        before: {
            '*': 'hasAccess',
        }
    },
    settings: {
        rest: '/v1',
    },
    events: {
        'review:created': {
            async handler(ctx) {
                const review = ctx.params.review;
                const date = formatISO(new Date(), {representation: 'date'});
                await this.adapter.model.updateOne(
                    {date, object: review.object},
                    {$setOnInsert: {date, type: review.type, object: review.object, rating: [0, 0, 0, 0, 0]}},
                    {upsert: true},
                );
                const $inc = {};
                $inc[`rating.${review.rating - 1}`] = 1;
                await this.adapter.model.updateOne({date, object: review.object, }, {$inc});
            },
        },
        'place:deleted': {
            async handler(ctx) {
                const place = ctx.params.place;
                await this.adapter.model.deleteMany({object: place._id});
            },
        },
        'product:deleted': {
            async handler(ctx) {
                const product = ctx.params.product;
                await this.adapter.model.deleteMany({object: product._id});
            },
        },
        'season:deleted': {
            async handler(ctx) {
                const season = ctx.params.season;
                await this.adapter.model.deleteMany({object: season._id});
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
        ratings: {
            rest: 'GET /ratings',
            dates: {
                type: 'array',
                items: 'string',
                length: 2,
            },
            async handler(ctx) {
                return [];
            }
        },
    }
};
