const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const ModifierModel = require('../models/modifier.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const mongoose = require('mongoose');
const {MoleculerServerError} = require('moleculer').Errors;
const AuthorizeMixin = require('../mixins/authorize.mixin');

module.exports = {
    name: 'modifiers',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: ModifierModel,
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
        getGroups: {
            role: 'showcase:read',
            rest: 'GET /user/modifiers',
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
                        required: modifier.required,
                        picture: modifier.picture,
                        length: modifier.length,
                        type: modifier.type,
                    });
                });

                return result;

            }
        },
        getGroup: {
            role: 'showcase:read',
            rest: 'GET /user/modifier/:groupid',
            params: {
                groupid: 'objectID',
            },
            async handler(ctx) {

                const groupid = ctx.params.groupid;

                const group = await ctx.call('v1.modifiers.findOne', {query: {_id: groupid}});
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
            role: 'showcase:write',
            rest: 'POST /user/modifier',
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

                await this.broker.broadcast('content:updated');

            }
        },
        editGroup: {
            role: 'showcase:write',
            rest: 'PATCH /user/modifier',
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

                if (!required) {
                    await this.adapter.model.updateOne({_id: groupid}, {'items.$[].primary': false});
                }

                await this.adapter.model.updateOne({_id: groupid}, doc);

                await this.broker.broadcast('content:updated');

            }
        },
        sortGroup: {
            role: 'showcase:write',
            rest: 'PUT /user/modifiers',
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

                await this.broker.broadcast('content:updated');

            }
        },
        deleteGroup: {
            role: 'showcase:write',
            rest: 'DELETE /user/modifier/:groupid',
            params: {
                groupid: 'objectID',
            },
            async handler(ctx) {

                const groupid = ctx.params.groupid;

                const group = await ctx.call('v1.modifiers.findOne', {query: {_id: groupid}});
                if (!group) {
                    throw new MoleculerServerError(ctx.meta.__('group-not-found'), 404);
                }

                await ctx.call('v1.products.updateMany', {
                    filter: {'modifiers._id': groupid},
                    doc: {$pull: {modifiers: {_id: groupid}}}
                });

                await ctx.call('v1.modifiers.deleteOne', {query: {_id: groupid}});

                await this.broker.broadcast('content:updated');

            }
        },
        getItems: {
            role: 'showcase:read',
            rest: 'GET /user/modifier/items/:groupid',
            params: {
                groupid: 'objectID',
            },
            async handler(ctx) {

                const groupid = ctx.params.groupid;

                const group = await ctx.call('v1.modifiers.findOne', {query: {_id: groupid}});
                if (!group) {
                    throw new MoleculerServerError(ctx.meta.__('group-not-found'), 404);
                }

                const items = [];

                _.each(group.items, (item) => {
                    items.push({
                        itemid: item._id,
                        name: item.name,
                        description: item.description,
                        primary: item.primary,
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
            role: 'showcase:read',
            rest: 'GET /user/modifier/item/:groupid/:itemid',
            params: {
                groupid: 'objectID',
                itemid: 'objectID',
            },
            async handler(ctx) {

                const groupid = ctx.params.groupid;
                const itemid = ctx.params.itemid;

                const group = await ctx.call('v1.modifiers.findOne', {
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
                    description: item.description,
                    primary: item.primary,
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
            role: 'showcase:write',
            rest: 'POST /user/modifier/item',
            params: {
                groupid: 'objectID',
            },
            async handler(ctx) {

                const groupid = ctx.params.groupid;
                const group = await ctx.call('v1.modifiers.findOne', {query: {_id: groupid}});
                if (!group) {
                    throw new MoleculerServerError(ctx.meta.__('group-not-found'), 404);
                }

                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const picture = _.trim(ctx.params.picture);
                const primary = ctx.params.primary;
                const price = ctx.params.price;
                const value = ctx.params.value;
                const type = ctx.params.type;
                const proteins = ctx.params.proteins;
                const fats = ctx.params.fats;
                const carbohydrates = ctx.params.carbohydrates;
                const energy = ctx.params.energy;
                const code = _.trim(ctx.params.code);

                const item = {};
                item._id = new mongoose.Types.ObjectId();
                item.name = name;
                item.primary = primary;
                item.price = price;
                item.value = value;
                item.proteins = proteins;
                item.fats = fats;
                item.carbohydrates = carbohydrates;
                item.energy = energy;
                item.type = type;
                if (description) {
                    item.description = description;
                }
                if (picture) {
                    item.picture = picture;
                }
                if (code) {
                    item.code = code;
                }

                if (primary) {
                    await this.adapter.model.updateOne({_id: groupid}, {'items.$[].primary': false});
                }

                await this.adapter.model.updateOne({_id: groupid}, {$push: {items: item}, $inc: {length: 1}});

                await this.broker.broadcast('content:updated');

            }
        },
        editItem: {
            role: 'showcase:write',
            rest: 'PATCH /user/modifier/item',
            params: {
                groupid: 'objectID',
                itemid: 'objectID',
            },
            async handler(ctx) {

                const groupid = ctx.params.groupid;
                const group = await ctx.call('v1.modifiers.findOne', {query: {_id: groupid}});
                if (!group) {
                    throw new MoleculerServerError(ctx.meta.__('group-not-found'), 404);
                }

                const itemid = ctx.params.itemid;
                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const picture = _.trim(ctx.params.picture);
                const primary = ctx.params.primary;
                const price = ctx.params.price;
                const value = ctx.params.value;
                const type = ctx.params.type;
                const proteins = ctx.params.proteins;
                const fats = ctx.params.fats;
                const carbohydrates = ctx.params.carbohydrates;
                const energy = ctx.params.energy;
                const code = _.trim(ctx.params.code);

                const item = {};
                item._id = itemid;
                item.name = name;
                item.primary = primary;
                item.price = price;
                item.value = value;
                item.proteins = proteins;
                item.fats = fats;
                item.carbohydrates = carbohydrates;
                item.energy = energy;
                item.type = type;
                if (description) {
                    item.description = description;
                }
                if (picture) {
                    item.picture = picture;
                }
                if (code) {
                    item.code = code;
                }

                if (primary) {
                    await this.adapter.model.updateOne({_id: groupid}, {'items.$[].primary': false});
                }

                await this.adapter.model.updateOne({_id: groupid, 'items._id': itemid}, {'items.$': item});

                await this.broker.broadcast('content:updated');

            }
        },
        sortItem: {
            role: 'showcase:write',
            rest: 'PUT /user/modifier/items',
            params: {
                groupid: 'objectID',
                itemid: 'objectID',
                index: 'number',
            },
            async handler(ctx) {

                const groupid = ctx.params.groupid;
                const itemid = ctx.params.itemid;
                const index = _.parseInt(ctx.params.index);

                const group = await ctx.call('v1.modifiers.findOne', {query: {_id: groupid}});
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

                    await this.broker.broadcast('content:updated');

                }

            }
        },
        deleteItem: {
            role: 'showcase:write',
            rest: 'DELETE /user/modifier/item/:groupid/:itemid',
            params: {
                groupid: 'objectID',
                itemid: 'objectID',
            },
            async handler(ctx) {

                const groupid = ctx.params.groupid;
                const itemid = ctx.params.itemid;

                const group = await ctx.call('v1.modifiers.findOne', {query: {_id: groupid}});
                if (!group) {
                    throw new MoleculerServerError(ctx.meta.__('group-not-found'), 404);
                }

                if (_.size(group.items)) {

                    const doc = {
                        $set: {length: group.items.length - 1},
                        $pull: {items: {_id: itemid}}
                    };

                    await ctx.call('v1.modifiers.updateOne', {filter: {_id: groupid}, doc});

                    await this.broker.broadcast('content:updated');

                }

            }
        },
        selector: {
            rest: 'GET /modifiers',
            cache: false,
            async handler(ctx) {
                return await this.adapter.model.find({}, 'id name').sort('order').exec();
            }
        },
    },
};
