const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const GroupModel = require('../models/group.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const mongoose = require('mongoose');
const {MoleculerServerError} = require('moleculer').Errors;
const {listToTree} = require('../helpers/list-to-tree');
const {translitIt} = require('../helpers/translit-it');
const AuthorizeMixin = require('../mixins/authorize.mixin');

module.exports = {
    name: 'groups',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: GroupModel,
    hooks: {
        before: {
            '*': 'hasAccess',
        }
    },
    settings: {
        rest: '/v1',
    },
    events: {
        'content:updated': {
            async handler(ctx) {
                await this.updateCatalog(ctx);
            }
        },
        'sticker:deleted': {
            async handler(ctx) {
                const sticker = ctx.params.sticker;
                await this.adapter.model.updateMany({'stickers._id': sticker._id}, {$pull: {stickers: {_id: sticker._id}}});
            }
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
        // v1.groups.items
        items: {
            role: 'showcase:read',
            rest: 'GET /user/groups/items/:id?',
            params: {
                id: {
                    type: 'objectID',
                    optional: true,
                },
            },
            async handler(ctx) {

                const id = ctx.params.id;
                const search = ctx.params.search;
                const result = {groups: [], products: []};

                const where = {};
                if (id) {
                    where.parent = id;
                } else {
                    where.parent = {$exists: false};
                }
                /*if (query) {
                    where['$text'] = {$search: query};
                }*/

                const groups = await ctx.call('v1.groups.find', {
                    query: where,
                    search,
                    searchFields: 'name description url',
                    sort: 'order'
                });

                _.each(groups, (group) => {
                    result.groups.push({
                        id: group._id,
                        name: group.name,
                        active: group.active,
                        description: group.description,
                        picture: _.get(group, 'picture', 'no-photo.png'),
                        groups: group.groups ? group.groups : 0,
                        products: group.products ? group.products : 0,
                        stickers: _.get(group, 'stickers', []),
                    });
                });

                if (id || search) {

                    const where = {};
                    if (id) {
                        where.groups = id;
                    }

                    const products = await ctx.call('v1.products.find', {
                        query: where,
                        search: search,
                        searchFields: 'name description words url',
                        sort: 'order'
                    });

                    _.each(products, (product) => {
                        result.products.push({
                            id: product._id,
                            name: product.name,
                            picture: _.get(product, 'gallery.0.picture', 'no-photo.png'),
                            description: product.description,
                            quantity: product.quantity,
                            active: product.active,
                            stickers: _.get(product, 'stickers', []),
                        });
                    });

                }

                return result;

            }
        },
        // v1.groups.item
        item: {
            role: 'showcase:read',
            rest: 'GET /user/group/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const result = {};

                result.stickers = await ctx.call('v1.stickers.selector');

                if (id === 'new') {
                    return result;
                }

                const group = await this.adapter.model.findOne({_id: id});
                if (!group) {
                    throw new MoleculerServerError(ctx.meta.__('group-not-found'), 404);
                }

                result.group = group.toJSON();

                return result;

            }
        },
        // v1.groups.add
        add: {
            role: 'showcase:write',
            rest: 'POST /user/group',
            async handler(ctx) {

                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const url = ctx.params.url || translitIt(name);
                const active = ctx.params.active === undefined ? true : ctx.params.active;
                const schedule = ctx.params.schedule;
                const parentid = ctx.params.parentid;
                const picture = ctx.params.picture;
                const stickers = [];
                _.each(ctx.params.stickers, (sticker) => {
                    stickers.push({_id: sticker.id, name: sticker.name, color: sticker.color});
                });

                const set = {};

                set.name = name;
                set.description = description;
                set.url = url;
                set.active = active;
                set.picture = picture;
                if (parentid) {
                    set.parent = parentid;
                }
                if (_.size(schedule)) {
                    set.schedule = schedule;
                }
                if (_.size(stickers)) {
                    set.stickers = stickers;
                }
                await ctx.call('v1.groups.create', set).catch(() => {
                    throw new MoleculerServerError(ctx.meta.__('url-is-used'));
                });

                await this.broker.broadcast('content:updated');

            }
        },
        // v1.groups.edit
        edit: {
            role: 'showcase:write',
            rest: 'PATCH /user/group',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id || mongoose.Types.ObjectId();

                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const url = ctx.params.url || translitIt(name);
                const active = ctx.params.active === undefined ? true : ctx.params.active;
                const schedule = ctx.params.schedule;
                const picture = ctx.params.picture;
                const stickers = [];
                _.each(ctx.params.stickers, (sticker) => {
                    stickers.push({_id: sticker.id, name: sticker.name, color: sticker.color});
                });

                const set = {};
                const unset = {};
                set.name = name;
                set.description = description;
                set.url = url;
                set.active = active;
                set.picture = picture;
                if (_.size(schedule)) {
                    set.schedule = schedule;
                } else {
                    unset.schedule = '';
                }
                if (_.size(stickers)) {
                    set.stickers = stickers;
                } else {
                    unset.stickers = '';
                }
                const doc = {$set: set};
                if (_.size(unset)) {
                    doc.$unset = unset;
                }
                await ctx.call('v1.groups.updateOne', {filter: {_id: id}, doc}).catch(() => {
                    throw new MoleculerServerError(ctx.meta.__('url-is-used'));
                });

                await this.broker.broadcast('content:updated');

            }
        },
        // v1.groups.sort
        sort: {
            role: 'showcase:write',
            rest: 'PUT /user/groups/sort',
            params: {
                ids: {
                    type: 'array',
                },
            },
            async handler(ctx) {

                const ids = ctx.params.ids;
                const ops = [];
                _.each(ids, (id, i) => {
                    ops.push({updateOne: {filter: {_id: id}, update: {order: i + 1}}});
                });

                await ctx.call('v1.groups.bulkWrite', {ops});

                await this.broker.broadcast('content:updated');

            }
        },
        // v1.groups.list
        /*list: {
            role: 'showcase:read',
            rest: 'GET /user/groups/list',
            async handler(ctx) {
                const items = await ctx.call('v1.groups.find', {
                    fields: '_id name',
                    sort: 'order'
                });
                const groups = [];
                _.each(items, (item) => {
                    groups.push({id: item._id.toString(), name: item.name});
                });
                return groups;
            }
        },*/
        // v1.groups.tree
        tree: {
            role: 'showcase:read',
            rest: 'GET /user/groups/tree/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const items = await ctx.call('v1.groups.find', {
                    fields: '_id name parent',
                    sort: 'order'
                });

                const groups = [];
                _.each(items, (item) => {
                    const itemid = item._id.toString();
                    const push = {id: itemid, name: item.name};
                    if (item.parent) {
                        push.parentid = item.parent.toString();
                    }
                    if (id !== itemid) {
                        groups.push(push);
                    }
                });

                const tree = listToTree(groups, {idKey: 'id', parentKey: 'parentid', childrenKey: 'child'});

                const result = [];

                const parseTree = (arr, count) => {
                    _.each(arr, (obj) => {
                        const push = {id: obj.id, name: obj.name, count: count};
                        if (obj.parentid) {
                            push.parentid = obj.parentid;
                        }
                        result.push(push);
                        if (obj.child) {
                            parseTree(obj.child, count + 1);
                        }
                    });
                };
                parseTree(tree, 0);

                return result;

            }
        },
        // v1.groups.move
        move: {
            role: 'showcase:write',
            rest: 'PUT /user/groups/move',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;
                const parentid = ctx.params.parentid;

                const doc = parentid ? {$set: {parent: parentid}} : {$unset: {parent: ''}};
                await ctx.call('v1.groups.updateOne', {filter: {_id: id}, doc});

                await this.broker.broadcast('content:updated');

            }
        },
        // v1.groups.delete
        delete: {
            role: 'showcase:write',
            rest: 'DELETE /user/group/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;
                const group = await ctx.call('v1.groups.findOne', {query: {_id: id}});
                if (!group) {
                    throw new MoleculerServerError(ctx.meta.__('group-not-found'), 404);
                }

                let count = 0;

                count += await ctx.call('v1.groups.countDocuments', {query: {parent: id}});
                count += await ctx.call('v1.products.countDocuments', {query: {group: id}});

                if (count > 0) {
                    throw new MoleculerServerError(ctx.meta.__('group-is-not-empty'));
                }

                await ctx.call('v1.groups.deleteOne', {query: {_id: id}});

                await this.broker.emit('group:deleted', {group});

                await this.broker.broadcast('content:updated');

            }
        },
        // v1.groups.updateCatalog
        updateCatalog: {
            role: 'showcase:read',
            rest: 'GET /user/update-catalog',
            async handler(ctx) {
                return await this.updateCatalog(ctx);
            }
        },
        selector: {
            rest: 'GET /groups',
            cache: false,
            async handler(ctx) {
                return await this.adapter.model.find({}, 'id name picture').sort('order').exec();
            }
        },
    },
    methods: {
        async updateCatalog(ctx) {

            // items

            const obj = {};
            const arr = [];

            const groupsById = {};
            const groups = await ctx.broker.call('v1.groups.find', {
                sort: 'order',
            });

            if (_.size(groups) === 0) {
                return false;
            }

            _.each(groups, group => {

                const id = group._id.toString();

                groupsById[id] = group;

                obj[id] = {
                    countGroups: 0,
                    countProducts: 0,
                    prices: {
                        min: 0,
                        max: 0,
                    },
                };

                const push = {id, url: group.url, name: group.name};
                if (group.parent) {
                    push.parentid = group.parent.toString();
                }
                arr.push(push);

            });

            _.each(groups, group => {
                if (group.parent && group.active) {
                    const parentid = group.parent.toString();
                    obj[parentid].countGroups++;
                }
            });

            const tree = listToTree(arr, {idKey: 'id', parentKey: 'parentid', childrenKey: 'child'});

            const setBreadcrumb = function (groups, parentPath, parentBreadcrumb) {
                _.each(groups, group => {
                    const path = parentPath ? `${parentPath}/${group.url}` : group.url;
                    const breadcrumb = [];
                    if (parentBreadcrumb) {
                        _.each(parentBreadcrumb, parentBreadcrumbItem => {
                            breadcrumb.push({
                                _id: parentBreadcrumbItem._id,
                                name: parentBreadcrumbItem.name,
                                path: parentBreadcrumbItem.path
                            });
                        });
                    }
                    breadcrumb.push({_id: group.id, name: group.name, path});
                    obj[group.id].path = path;
                    obj[group.id].breadcrumb = breadcrumb;
                    if (group.child) {
                        setBreadcrumb(group.child, path, breadcrumb);
                    }
                });
            };
            setBreadcrumb(tree);

            const products = await ctx.broker.call('v1.products.find', {
                query: {active: true},
                sort: 'order',
            });

            const prices = {};
            const productsByGroup = {};
            _.each(products, product => {
                _.each(product.groups, group => {
                    const id = group.toString();
                    if (obj[id]) {
                        obj[id].countProducts++;
                    }
                    if (!productsByGroup[id]) {
                        productsByGroup[id] = [];
                    }
                    productsByGroup[id].push(product);
                    _.each(product.prices, price => {
                        const values = prices[id] || [];
                        values.push(price.price);
                        prices[id] = _.uniq(values);
                    });
                    _.each(product.filters, filterid => {
                        if (obj[id]) {
                            const filters = _.get(obj, [id, 'filters'], []);
                            filters.push(filterid.toString());
                            if (_.size(filters)) {
                                obj[id].filters = _.uniq(filters);
                            } else {
                                delete obj[id].filters;
                            }
                        }
                    });
                });
            });
            _.each(prices, (values, id) => {
                if (_.size(values) > 1) {
                    obj[id].prices = {
                        min: _.min(values),
                        max: _.max(values),
                    };
                }
            });

            let ops = [];
            _.each(obj, (item, id) => {
                ops.push({updateOne: {filter: {_id: id}, update: item}});
            });
            await ctx.broker.call('v1.groups.bulkWrite', {ops});

        }
    }
};
