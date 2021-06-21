const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const ModifierModel = require('../models/modifier.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const mongoose = require('mongoose');
const {MoleculerServerError} = require('moleculer').Errors;

module.exports = {
    name: 'modifiers',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: ModifierModel,
    actions: {
        get: {
            cache: false,
        },
        find: {
            cache: false,
        },
        getGroups: {
            async handler(ctx) {

                const search = ctx.params.search;
                const result = [];

                const modifiers = await ctx.call('v1.modifiers.find', {
                    search,
                    searchFields: 'name description',
                    sort: 'order'
                });
                _.each(modifiers, modifier => {
                    result.push({
                        groupid: modifier._id,
                        name: modifier.name,
                        description: modifier.description,
                        picture: modifier.picture,
                        length: modifier.length,
                        type: modifier.type,
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

                const group = await ctx.call('v1.modifiers.findOne', {conditions: {_id: groupid}});
                if (!group) {
                    throw new MoleculerServerError(ctx.meta.__('group-not-found'), 404);
                }

                return {
                    groupid: group._id,
                    name: group.name,
                    description: group.description,
                    picture: group.picture,
                    required: group.required,
                    maximum: group.maximum,
                    type: group.type,
                    code: group.code,
                };

            }
        },
        addGroup: {
            async handler(ctx) {

                const type = ctx.params.type;
                const code = ctx.params.code;
                const required = ctx.params.required === true;
                const maximum = _.parseInt(ctx.params.maximum);
                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const picture = ctx.params.picture;

                let set = {};
                set.required = required;
                set.type = type;
                set.name = name;
                if (type === 'many') {
                    set.maximum = maximum;
                }
                set.items = [];
                set.length = 0;
                if (description) {
                    set.description = description;
                }
                if (picture) {
                    set.picture = picture;
                }
                if (code) {
                    set.code = code;
                }

                await ctx.call('v1.modifiers.create', set);

                await this.broker.emit('content:updated');

            }
        },
        editGroup: {
            params: {
                groupid: 'objectID',
            },
            async handler(ctx) {

                const groupid = ctx.params.groupid;
                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const picture = ctx.params.picture;
                const type = ctx.params.type;
                const code = _.trim(ctx.params.code);
                const required = ctx.params.required === true;
                const maximum = _.parseInt(ctx.params.maximum);

                const set = {};
                const unset = {};
                set.required = required;
                set.type = type;
                set.name = name;
                if (description) {
                    set.description = description;
                } else {
                    unset.description = '';
                }
                if (picture) {
                    set.picture = picture;
                } else {
                    unset.picture = '';
                }
                if (code) {
                    set.code = code;
                } else {
                    unset.code = '';
                }
                if (type === 'many') {
                    set.maximum = maximum;
                } else {
                    unset.maximum = '';
                }

                const doc = {$set: set};
                if (_.size(unset)) {
                    doc.$unset = unset;
                }

                await ctx.call('v1.modifiers.updateOne', {filter: {_id: groupid}, doc});

                await this.broker.emit('content:updated');

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

                await ctx.call('v1.modifiers.bulkWrite', {ops});

                await this.broker.emit('content:updated');

            }
        },
        deleteGroup: {
            params: {
                groupid: 'objectID',
            },
            async handler(ctx) {

                const groupid = ctx.params.groupid;

                const group = await ctx.call('v1.modifiers.findOne', {conditions: {_id: groupid}});
                if (!group) {
                    throw new MoleculerServerError(ctx.meta.__('group-not-found'), 404);
                }

                await ctx.call('v1.products.updateMany', {
                    filter: {'modifiers._id': groupid},
                    doc: {$pull: {modifiers: {_id: groupid}}}
                });

                await ctx.call('v1.modifiers.deleteOne', {conditions: {_id: groupid}});

                await this.broker.emit('content:updated');

            }
        },

        getItems: {
            params: {
                groupid: 'objectID',
            },
            async handler(ctx) {

                const groupid = ctx.params.groupid;

                const group = await ctx.call('v1.modifiers.findOne', {conditions: {_id: groupid}});
                if (!group) {
                    throw new MoleculerServerError(ctx.meta.__('group-not-found'), 404);
                }

                const items = [];

                _.each(group.items, (item) => {
                    items.push({
                        itemid: item._id,
                        name: item.name,
                        description: item.description,
                        picture: item.picture,
                        price: item.price,
                        value: item.value,
                        type: item.type,
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

                const group = await ctx.call('v1.modifiers.findOne', {
                    conditions: {
                        _id: groupid,
                        'items._id': itemid
                    }, projection: {'items.$': 1}
                });
                if (!_.get(group, 'items.0')) {
                    throw new MoleculerServerError(ctx.meta.__('group-not-found'), 404);
                }

                const item = group.items[0];

                return {
                    itemid: item._id,
                    name: item.name,
                    description: item.description,
                    picture: item.picture,
                    price: item.price,
                    value: item.value,
                    proteins: item.proteins,
                    fats: item.fats,
                    carbohydrates: item.carbohydrates,
                    energy: item.energy,
                    type: item.type,
                    code: item.code,
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
                const description = _.trim(ctx.params.description);
                const picture = _.trim(ctx.params.picture);
                const price = ctx.params.price;
                const value = ctx.params.value;
                const type = ctx.params.type;
                const proteins = ctx.params.proteins;
                const fats = ctx.params.fats;
                const carbohydrates = ctx.params.carbohydrates;
                const energy = ctx.params.energy;
                const code = _.trim(ctx.params.code);

                const set = {};
                set._id = new mongoose.Types.ObjectId();
                set.name = name;
                set.price = price;
                set.value = value;
                set.proteins = proteins;
                set.fats = fats;
                set.carbohydrates = carbohydrates;
                set.energy = energy;
                set.type = type;
                if (description) {
                    set.description = description;
                }
                if (picture) {
                    set.picture = picture;
                }
                if (code) {
                    set.code = code;
                }

                const doc = {$push: {items: set}, $inc: {length: 1}};

                await ctx.call('v1.modifiers.updateOne', {filter: {_id: groupid}, doc});

                await this.broker.emit('content:updated');

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
                const description = _.trim(ctx.params.description);
                const picture = _.trim(ctx.params.picture);
                const price = ctx.params.price;
                const value = ctx.params.value;
                const type = ctx.params.type;
                const proteins = ctx.params.proteins;
                const fats = ctx.params.fats;
                const carbohydrates = ctx.params.carbohydrates;
                const energy = ctx.params.energy;
                const code = _.trim(ctx.params.code);

                const set = {};
                set._id = itemid;
                set.name = name;
                set.price = price;
                set.value = value;
                set.proteins = proteins;
                set.fats = fats;
                set.carbohydrates = carbohydrates;
                set.energy = energy;
                set.type = type;
                if (description) {
                    set.description = description;
                }
                if (picture) {
                    set.picture = picture;
                }
                if (code) {
                    set.code = code;
                }

                const doc = {$set: {'items.$': set}};

                await ctx.call('v1.modifiers.updateOne', {filter: {_id: groupid, 'items._id': itemid}, doc});

                await this.broker.emit('content:updated');

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

                const group = await ctx.call('v1.modifiers.findOne', {conditions: {_id: groupid}});
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

                    await ctx.call('v1.modifiers.updateOne', {filter: {_id: groupid}, doc});

                    await this.broker.emit('content:updated');

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

                const group = await ctx.call('v1.modifiers.findOne', {conditions: {_id: groupid}});
                if (!group) {
                    throw new MoleculerServerError(ctx.meta.__('group-not-found'), 404);
                }

                if (_.size(group.items)) {

                    const doc = {
                        $set: {length: group.items.length - 1},
                        $pull: {items: {_id: itemid}}
                    };

                    await ctx.call('v1.modifiers.updateOne', {filter: {_id: groupid}, doc});

                    await this.broker.emit('content:updated');

                }

            }
        },
    },
};
