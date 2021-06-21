const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const ReviewModel = require('../models/review.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;

module.exports = {
    name: 'reviews',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: ReviewModel,
    actions: {
        // v1.reviews.get
        get: {
            cache: false,
        },
        // v1.reviews.find
        find: {
            cache: false,
        },
        // v1.reviews.items
        items: {
            params: {
                type: {
                    type: 'string',
                    enum: ['global', 'place', 'product', 'user', 'review'],
                },
                objectid: 'objectID',
            },
            async handler(ctx) {

                const type = ctx.params.type;
                const objectid = ctx.params.objectid;
                const result = [];

                const reviews = await this.adapter.model.find({type, object: objectid}).sort({created: -1})
                    .populate({path: 'author', select: 'name avatar'})
                    .exec();

                _.each(reviews, review => {
                    result.push({
                        reviewid: review._id,
                        author: review.author,
                        message: review.message,
                        rating: review.rating,
                        created: review.created,
                    });
                });

                return result;

            }
        },
        // v1.reviews.add
        add: {
            params: {
                type: {
                    type: 'string',
                    enum: ['global', 'place', 'product', 'user', 'review'],
                },
                objectid: 'objectID',
                from: {
                    type: 'string',
                    enum: ['app', 'site', 'office'],
                },
                rating: {
                    type: 'number',
                    positive: true,
                    convert: true,
                    min: 1,
                    max: 5,
                },
                message: 'string',
            },
            async handler(ctx) {

                const type = ctx.params.type;
                const rating = ctx.params.rating;
                const from = ctx.params.from;
                const message = _.trim(ctx.params.message);
                const author = ctx.meta.user.id;
                const object = ctx.params.objectid;

                await this.adapter.model.create({type, rating, from, message, author, object});

            }
        },
        // v1.reviews.delete
        delete: {
            params: {
                reviewid: 'objectID',
            },
            async handler(ctx) {

                const reviewid = ctx.params.reviewid;

                const review = await this.adapter.model.findOne({_id: reviewid});
                if (!review) {
                    throw new MoleculerServerError(ctx.meta.__('review-not-found'), 404);
                }

                await this.adapter.model.deleteOne({_id: reviewid});

            }
        },
    }
};
