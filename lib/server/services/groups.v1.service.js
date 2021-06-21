const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const GroupModel = require('../models/group.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const mongoose = require('mongoose');
const {MoleculerServerError} = require('moleculer').Errors;
const {listToTree} = require('../helpers/list-to-tree');
const {translitIt} = require('../helpers/translit-it');

module.exports = {
    name: 'groups',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: GroupModel,
    events: {
        'content:updated': {
            async handler(ctx) {
                await this.updateCatalog(ctx);
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
        // v1.groups.items
        items: {
            params: {
                groupid: {
                    type: 'objectID',
                    optional: true,
                },
            },
            async handler(ctx) {

                const groupid = ctx.params.groupid;
                const search = ctx.params.search;
                const result = {groups: [], products: []};

                const where = {};
                if (groupid) {
                    where.parent = groupid;
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
                        groupid: group._id,
                        name: group.name,
                        active: group.active,
                        description: group.description,
                        picture: _.get(group, 'picture', 'no-photo.png'),
                        groups: group.groups ? group.groups : 0,
                        products: group.products ? group.products : 0,
                        stickers: _.get(group, 'stickers', []),
                    });
                });

                if (groupid || search) {

                    const where = {};
                    if (groupid) {
                        where.groups = groupid;
                    }

                    const products = await ctx.call('v1.products.find', {
                        query: where,
                        search: search,
                        searchFields: 'name description words url',
                        sort: 'order'
                    });

                    _.each(products, (product) => {
                        result.products.push({
                            productid: product._id,
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
            params: {
                groupid: 'objectID',
            },
            async handler(ctx) {

                const groupid = ctx.params.groupid;

                const result = {stickers: []};
                const indexses = {};

                const stickers = await ctx.call('v1.stickers.find', {sort: 'order'});
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

                if (groupid === 'new') {
                    return result;
                }

                const group = await ctx.call('v1.groups.findOne', {conditions: {_id: groupid}});
                if (!group) {
                    throw new MoleculerServerError(ctx.meta.__('group-not-found'), 404);
                }

                result.groupid = group._id;
                result.parentid = group.parent;
                result.picture = group.picture;
                result.name = group.name;
                result.description = group.description;
                result.url = group.url;
                result.active = group.active;
                result.schedule = group.schedule;

                _.each(group.stickers, sticker => {
                    const stickerid = sticker._id.toString();
                    if (indexses[stickerid] !== undefined) {
                        const index = indexses[stickerid];
                        result.stickers[index].selected = true;
                    }
                });

                return result;

            }
        },
        // v1.groups.add
        add: {
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
                    stickers.push({_id: sticker.stickerid, name: sticker.name, color: sticker.color, url: sticker.url});
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

                await this.broker.emit('content:updated');

            }
        },
        // v1.groups.edit
        edit: {
            params: {
                groupid: 'objectID',
            },
            async handler(ctx) {

                const groupid = ctx.params.groupid || mongoose.Types.ObjectId();

                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const url = ctx.params.url || translitIt(name);
                const active = ctx.params.active === undefined ? true : ctx.params.active;
                const schedule = ctx.params.schedule;
                const picture = ctx.params.picture;
                const stickers = [];
                _.each(ctx.params.stickers, (sticker) => {
                    stickers.push({_id: sticker.stickerid, name: sticker.name, color: sticker.color, url: sticker.url});
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
                await ctx.call('v1.groups.updateOne', {filter: {_id: groupid}, doc}).catch(() => {
                    throw new MoleculerServerError(ctx.meta.__('url-is-used'));
                });

                await this.broker.emit('content:updated');

            }
        },
        // v1.groups.sort
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

                await ctx.call('v1.groups.bulkWrite', {ops});

                await this.broker.emit('content:updated');

            }
        },
        // v1.groups.list
        list: {
            async handler(ctx) {

                const items = await ctx.call('v1.groups.find', {
                    fields: '_id name',
                    sort: 'order'
                });

                const groups = [];
                _.each(items, (item) => {
                    groups.push({groupid: item._id.toString(), name: item.name});
                });

                return groups;

            }
        },
        // v1.groups.tree
        tree: {
            params: {
                groupid: 'objectID',
            },
            async handler(ctx) {

                const groupid = ctx.params.groupid;

                const items = await ctx.call('v1.groups.find', {
                    fields: '_id name parent',
                    sort: 'order'
                });

                const groups = [];
                _.each(items, (item) => {
                    const itemid = item._id.toString();
                    const push = {groupid: itemid, name: item.name};
                    if (item.parent) {
                        push.parentid = item.parent.toString();
                    }
                    if (groupid !== itemid) {
                        groups.push(push);
                    }
                });

                const tree = listToTree(groups, {idKey: 'groupid', parentKey: 'parentid', childrenKey: 'child'});

                const result = [];

                const parseTree = (arr, count) => {
                    _.each(arr, (obj) => {
                        const push = {groupid: obj.groupid, name: obj.name, count: count};
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
            params: {
                groupid: 'objectID',
            },
            async handler(ctx) {

                const groupid = ctx.params.groupid;
                const parentid = ctx.params.parentid;

                const doc = parentid ? {$set: {parent: parentid}} : {$unset: {parent: ''}};
                await ctx.call('v1.groups.updateOne', {filter: {_id: groupid}, doc});

                await this.broker.emit('content:updated');

            }
        },
        // v1.groups.delete
        delete: {
            params: {
                groupid: 'objectID',
            },
            async handler(ctx) {

                const groupid = ctx.params.groupid;
                const group = await ctx.call('v1.groups.findOne', {conditions: {_id: groupid}});
                if (!group) {
                    throw new MoleculerServerError(ctx.meta.__('group-not-found'), 404);
                }

                let count = 0;

                count += await ctx.call('v1.groups.countDocuments', {filter: {parent: groupid}});
                count += await ctx.call('v1.products.countDocuments', {filter: {group: groupid}});

                if (count > 0) {
                    throw new MoleculerServerError(ctx.meta.__('group-is-not-empty'));
                }

                await ctx.call('v1.groups.deleteOne', {conditions: {_id: groupid}});

                await this.broker.emit('content:updated');

            }
        },
        // v1.groups.updateCatalog
        updateCatalog: {
            async handler(ctx) {
                return await this.updateCatalog(ctx);
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

                const groupid = group._id.toString();

                groupsById[groupid] = group;

                obj[groupid] = {
                    countGroups: 0,
                    countProducts: 0,
                    prices: {
                        min: 0,
                        max: 0,
                    },
                };

                const push = {groupid, url: group.url, name: group.name};
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

            const tree = listToTree(arr, {idKey: 'groupid', parentKey: 'parentid', childrenKey: 'child'});

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
                    breadcrumb.push({_id: group.groupid, name: group.name, path});
                    obj[group.groupid].path = path;
                    obj[group.groupid].breadcrumb = breadcrumb;
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
                    const groupid = group.toString();
                    if (obj[groupid]) {
                        obj[groupid].countProducts++;
                    }
                    if (!productsByGroup[groupid]) {
                        productsByGroup[groupid] = [];
                    }
                    productsByGroup[groupid].push(product);
                    _.each(product.prices, price => {
                        const values = prices[groupid] || [];
                        values.push(price.price);
                        prices[groupid] = _.uniq(values);
                    });
                    _.each(product.filters, filterid => {
                        if (obj[groupid]) {
                            const filters = _.get(obj, [groupid, 'filters'], []);
                            filters.push(filterid.toString());
                            if (_.size(filters)) {
                                obj[groupid].filters = _.uniq(filters);
                            } else {
                                delete obj[groupid].filters;
                            }
                        }
                    });
                });
            });
            _.each(prices, (values, groupid) => {
                if (_.size(values) > 1) {
                    obj[groupid].prices = {
                        min: _.min(values),
                        max: _.max(values),
                    };
                }
            });

            let ops = [];
            _.each(obj, (item, groupid) => {
                ops.push({updateOne: {filter: {_id: groupid}, update: item}});
            });
            await ctx.broker.call('v1.groups.bulkWrite', {ops});

        }
    }
};
