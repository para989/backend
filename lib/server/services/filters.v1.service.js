const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const FilterModel = require('../models/filter.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const mongoose = require('mongoose');
const {MoleculerServerError} = require('moleculer').Errors;
const AuthorizeMixin = require('../mixins/authorize.mixin');

module.exports = {
    name: 'filters',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: FilterModel,
    hooks: {
        before: {
            '*': 'hasAccess',
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
        getGroups: {
            async handler(ctx) {

                const result = [];
                const filters = await ctx.call('v1.filters.find', {query: {}, sort: 'order'});
                _.each(filters, filter => {
                    result.push({
                        groupid: filter._id,
                        name: filter.name,
                        length: filter.length,
                        type: filter.type,
                    });
                });

                return result;

            }
        },
        getGroup: {
            params: {
                groupid: 'objectID',
            },
            async handler(ctx) {

                const groupid = ctx.params.groupid;

                const group = await ctx.call('v1.filters.findOne', {query: {_id: groupid}});
                if (!group) {
                    throw new MoleculerServerError(ctx.meta.__('group-not-found'), 404);
                }

                return {
                    groupid: group._id,
                    name: group.name,
                    maximum: group.maximum,
                    type: group.type,
                };

            }
        },
        addGroup: {
            async handler(ctx) {

                const type = ctx.params.type;
                const maximum = _.parseInt(ctx.params.maximum);
                const name = _.trim(ctx.params.name);

                const set = {};
                set.user = ctx.meta.user.id;
                set.type = type;
                set.name = name;
                if (type === 'many') {
                    set.maximum = maximum;
                }
                set.items = [];
                set.length = 0;

                await ctx.call('v1.filters.create', set);

            }
        },
        editGroup: {
            params: {
                groupid: 'objectID',
            },
            async handler(ctx) {

                const groupid = ctx.params.groupid;
                const name = _.trim(ctx.params.name);
                const type = ctx.params.type;
                const maximum = _.parseInt(ctx.params.maximum);

                const set = {};
                set.type = type;
                set.name = name;

                let unset = {};
                if (type === 'many') {
                    set.maximum = maximum;
                } else {
                    unset.maximum = '';
                }

                const doc = {$set: set};
                if (_.size(unset)) {
                    doc.$unset = unset;
                }

                await ctx.call('v1.filters.updateOne', {filter: {_id: groupid}, doc});

            }
        },
        sortGroup: {
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

                await ctx.call('v1.filters.bulkWrite', {ops});

            }
        },
        deleteGroup: {
            params: {
                groupid: 'objectID',
            },
            async handler(ctx) {

                const groupid = ctx.params.groupid;

                const group = await ctx.call('v1.filters.findOne', {query: {_id: groupid}});
                if (!group) {
                    throw new MoleculerServerError(ctx.meta.__('group-not-found'), 404);
                }

                await ctx.call('v1.products.updateMany', {
                    filter: {'filters._id': groupid},
                    doc: {$pull: {filters: {_id: groupid}}}
                });

                await ctx.call('v1.groups.updateMany', {
                    filter: {'filters._id': groupid},
                    doc: {$pull: {filters: {_id: groupid}}}
                });

                await ctx.call('v1.filters.deleteOne', {query: {_id: groupid}});

            }
        },

        getItems: {
            params: {
                groupid: 'objectID',
            },
            async handler(ctx) {

                const groupid = ctx.params.groupid;

                const group = await ctx.call('v1.filters.findOne', {query: {_id: groupid}});
                if (!group) {
                    throw new MoleculerServerError(ctx.meta.__('group-not-found'), 404);
                }

                const items = [];

                _.each(group.items, (item) => {
                    items.push({
                        itemid: item._id,
                        name: item.name,
                    });
                });

                return items;

            }
        },
        getItem: {
            params: {
                groupid: 'objectID',
                itemid: 'objectID',
            },
            async handler(ctx) {

                const groupid = ctx.params.groupid;
                const itemid = ctx.params.itemid;

                const group = await ctx.call('v1.filters.findOne', {
                    query: {
                        _id: groupid,
                        'items._id': itemid
                    },
                    fields: {'items.$': 1},
                });
                if (!_.get(group, 'items.0')) {
                    throw new MoleculerServerError(ctx.meta.__('group-not-found'), 404);
                }

                const item = group.items[0];

                return {
                    itemid: item._id,
                    name: item.name,
                };

            }
        },
        addItem: {
            params: {
                groupid: 'objectID',
            },
            async handler(ctx) {

                const groupid = ctx.params.groupid;
                const name = _.trim(ctx.params.name);

                const set = {};
                set._id = new mongoose.Types.ObjectId();
                set.name = name;

                const doc = {$push: {items: set}, $inc: {length: 1}};

                await ctx.call('v1.filters.updateOne', {filter: {_id: groupid}, doc});

            }
        },
        editItem: {
            params: {
                groupid: 'objectID',
                itemid: 'objectID',
            },
            async handler(ctx) {

                const itemid = ctx.params.itemid;
                const groupid = ctx.params.groupid;
                const name = _.trim(ctx.params.name);

                const set = {};
                set._id = itemid;
                set.name = name;

                const doc = {$set: {'items.$': set}};

                await ctx.call('v1.filters.updateOne', {filter: {_id: groupid, 'items._id': itemid}, doc});

            }
        },
        sortItem: {
            params: {
                groupid: 'objectID',
                itemid: 'objectID',
                index: 'number',
            },
            async handler(ctx) {

                const groupid = ctx.params.groupid;
                const itemid = ctx.params.itemid;
                const index = _.parseInt(ctx.params.index);

                const group = await ctx.call('v1.filters.findOne', {query: {_id: groupid}});
                if (!group) {
                    throw new MoleculerServerError(ctx.meta.__('group-not-found'), 404);
                }

                const items = group.items;
                if (_.size(items)) {
                    let item;
                    _.each(items, (obj, i) => {
                        if (obj._id.toString() === itemid) {
                            item = obj;
                            items.splice(i, 1);
                            return false;
                        }
                    });
                    if (item) {
                        items.splice(index, 0, item);
                    }

                    const doc = {$set: {items, length: _.size(items)}};

                    await ctx.call('v1.filters.updateOne', {filter: {_id: groupid}, doc});

                }

            }
        },
        deleteItem: {
            params: {
                groupid: 'objectID',
                itemid: 'objectID',
            },
            async handler(ctx) {

                const groupid = ctx.params.groupid;
                const itemid = ctx.params.itemid;

                const group = await ctx.call('v1.filters.findOne', {query: {_id: groupid}});
                if (!group) {
                    throw new MoleculerServerError(ctx.meta.__('group-not-found'), 404);
                }

                if (_.size(group.items)) {

                    const doc = {
                        $set: {length: group.items.length - 1},
                        $pull: {items: {_id: itemid}}
                    };

                    await ctx.call('v1.filters.updateOne', {filter: {_id: groupid}, doc});

                }

            }
        },
    },
};
