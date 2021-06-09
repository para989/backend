const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const StickerModel = require('../models/sticker.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;

module.exports = {
    name: 'stickers',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: StickerModel,
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

                const stickers = await ctx.call('v1.stickers.find', {search, searchFields: 'name', sort: 'order'});
                _.each(stickers, sticker => {
                    result.push({
                        stickerid: sticker._id,
                        name: sticker.name,
                        color: sticker.color,
                    });
                });

                return result;

            }
        },
        item: {
            params: {
                stickerid: 'objectID',
            },
            async handler(ctx) {

                const stickerid = ctx.params.stickerid;

                const sticker = await ctx.call('v1.stickers.findOne', {conditions: {_id: stickerid}});
                if (!sticker) {
                    throw new MoleculerServerError('Sticker not found', 404);
                }

                return {
                    stickerid: sticker._id,
                    name: sticker.name,
                    color: sticker.color,
                };

            }
        },
        add: {
            async handler(ctx) {

                const name = _.trim(ctx.params.name);
                const color = ctx.params.color;

                const set = {};
                set.name = name;
                set.color = color;
                set.length = 0;

                await ctx.call('v1.stickers.create', set);

            }
        },
        edit: {
            params: {
                stickerid: 'objectID',
            },
            async handler(ctx) {

                const stickerid = ctx.params.stickerid;
                const name = _.trim(ctx.params.name);
                const color = ctx.params.color;

                const set = {};
                set.name = name;

                set.color = color;

                const doc = {$set: set};

                await ctx.call('v1.stickers.updateOne', {filter: {_id: stickerid}, doc});

                await ctx.call('v1.groups.updateMany', {
                    filter: {'stickers._id': stickerid},
                    doc: {$set: {'stickers.$.name': name, 'stickers.$.color': color}}
                });

                await ctx.call('v1.products.updateMany', {
                    filter: {'stickers._id': stickerid},
                    doc: {$set: {'stickers.$.name': name, 'stickers.$.color': color}}
                });

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
                _.each(ids, (stickerid, i) => {
                    ops.push({updateOne: {filter: {_id: stickerid}, update: {order: i + 1}}});
                });

                await ctx.call('v1.stickers.bulkWrite', {ops});

            }
        },

        delete: {
            params: {
                stickerid: 'objectID',
            },
            async handler(ctx) {

                const stickerid = ctx.params.stickerid;

                const sticker = await ctx.call('v1.stickers.findOne', {conditions: {_id: stickerid}});
                if (!sticker) {
                    throw new MoleculerServerError('Sticker not found', 404);
                }

                await ctx.call('v1.groups.updateMany', {
                    filter: {'stickers._id': stickerid},
                    doc: {$pull: {stickers: {_id: stickerid}}}
                });

                await ctx.call('v1.products.updateMany', {
                    filter: {'stickers._id': stickerid},
                    doc: {$pull: {stickers: {_id: stickerid}}}
                });

                await ctx.call('v1.stickers.deleteOne', {conditions: {_id: stickerid}});

            }
        },
    }
};
