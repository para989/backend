const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const ReviewModel = require('../models/review.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;
const AuthorizeMixin = require('../mixins/authorize.mixin');

module.exports = {
    name: 'reviews',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: ReviewModel,
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
        // v1.reviews.items
        items: {
            // role: 'reviews:read',
            rest: 'GET /user/reviews',
            params: {
                type: {
                    type: 'string',
                    enum: ['customer', 'user'],
                },
                objectid: {
                    type: 'objectID',
                    optional: true,
                },
            },
            async handler(ctx) {

                // 'global', 'place', 'product', 'user', 'review'

                const type = ctx.params.type;
                const objectid = ctx.params.objectid;
                const result = [];

                const where = {};
                if (type === 'user') {
                    where.type = 'user';
                } else {
                    where.type = {$in: ['place', 'product']};
                }
                if (objectid) {
                    where.object = objectid;
                }

                const reviews = await this.adapter.model.find(where).sort('-created')
                    .populate({path: 'author', select: 'name phone email avatar'})
                    .sort('-created')
                    .limit(1000)
                    .exec();

                _.each(reviews, review => {
                    result.push({
                        id: review._id,
                        author: review.author,
                        message: review.message,
                        rating: review.rating,
                        photos: review.photos,
                        created: review.created,
                    });
                });

                return result;

            }
        },
        // v1.reviews.add
        add: {
            role: 'reviews:write',
            rest: 'POST /user/review',
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
            role: 'reviews:write',
            rest: 'DELETE /user/review/:reviewid',
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

        // v1.reviews.send
        send: {
            rest: 'POST /customer/review',
            params: {
                customerid: 'objectID',
                placeid: 'objectID',
                productid: {
                    type: 'objectID',
                    optional: true,
                },
                from: {
                    type: 'string',
                    enum: ['app', 'site'],
                    default: 'app',
                },
                rating: {
                    type: 'number',
                    positive: true,
                    convert: true,
                    min: 1,
                    max: 5,
                },
                message: 'string',
                photos: {
                    type: 'array',
                    optional: true,
                },
            },
            async handler(ctx) {

                const customerid = ctx.params.customerid;
                const placeid = ctx.params.placeid;
                const productid = ctx.params.productid;
                const from = ctx.params.from;
                const rating = ctx.params.rating;
                const message = _.trim(ctx.params.message);
                const photos = ctx.params.photos;

                const set = {rating, from, message, author: customerid, place: placeid};
                if (productid) {
                    set.type = 'product';
                    set.object = productid;
                } else {
                    set.type = 'place';
                    set.object = placeid;
                }
                if (_.size(photos)) {
                    set.photos = photos;
                }

                const review = await this.adapter.model.create(set);

                if (placeid) {
                    const place = await ctx.call('v1.places.get', {id: placeid, fields: 'address'});
                    if (place) {
                        review.address = place.address;
                    }
                }

                const customer = await ctx.call('v1.customers.get', {id: customerid, fields: 'name phone email'});
                if (customer) {
                    review.name = customer.name;
                    review.phone = customer.phone;
                    review.email = customer.email;
                }

                await this.broker.emit('review:created', review);

            }
        },
    }
};
