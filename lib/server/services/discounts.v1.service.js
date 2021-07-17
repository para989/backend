const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const DiscountModel = require('../models/discount.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;

module.exports = {
    name: 'discounts',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: DiscountModel,
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
        items: {
            async handler(ctx) {

                const search = ctx.params.search;
                const result = [];

                const where = {};
                /*if (query) {
                    where['$text'] = {$search: query};
                }*/

                const discounts = await ctx.call('v1.discounts.find', {
                    query: where,
                    search,
                    searchFields: 'name description',
                    sort: 'order'
                });
                _.each(discounts, discount => {
                    result.push({
                        discountid: discount._id,
                        name: discount.name,
                        description: discount.description,
                        type: discount.type,
                    });
                });

                return result;

            }
        },
        item: {
            params: {
                discountid: 'objectID',
            },
            async handler(ctx) {

                const discountid = ctx.params.discountid;

                const result = {products: []};
                const indexes = {};

                const products = await ctx.call('v1.products.find', {
                    query: {},
                    fields: '_id name',
                    sort: 'order',
                    limit: 1000
                });
                _.each(products, (product, index) => {
                    const productid = product._id.toString();
                    indexes[productid] = index;
                    result.products.push({productid, name: product.name});
                });

                if (discountid === 'new') {
                    return result;
                }

                const discount = await ctx.call('v1.discounts.findOne', {conditions: {_id: discountid}});
                if (!discount) {
                    throw new MoleculerServerError(ctx.meta.__('discount-not-found'), 404);
                }

                result.discountid = discount._id.toString();
                result.name = discount.name;
                result.description = discount.description;
                result.combines = discount.combines;
                result.age = discount.age;
                result.period = discount.period;
                result.triggering = discount.triggering;
                result.type = discount.type;
                result.next = discount.next;
                result.privilege = discount.privilege;
                result.condition = discount.condition;

                return result;

            }
        },
        add: {
            async handler(ctx) {

                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const type = ctx.params.type;
                const placement = ctx.params.placement;
                const period = ctx.params.period;
                const audience = ctx.params.audience;
                const combines = ctx.params.combines;
                const age = ctx.params.age;
                const triggering = ctx.params.triggering;
                const next = ctx.params.next;
                const birthday = ctx.params.birthday;
                const moment = ctx.params.moment;
                const privilege = ctx.params.privilege;
                const condition = ctx.params.condition;

                const set = {};
                set.user = ctx.meta.user.id;
                set.name = name;
                set.description = description;
                set.type = type;
                set.placement = placement;
                set.audience = audience;
                set.combines = combines;
                set.age = age;
                set.privilege = privilege;
                set.condition = condition;
                if (period) {
                    set.period = period;
                }
                if (_.isNumber(triggering) && triggering > 0) {
                    set.triggering = triggering;
                }
                if (next) {
                    set.next = next;
                }
                if (birthday) {
                    set.birthday = birthday;
                }
                if (moment) {
                    set.moment = moment;
                }

                await ctx.call('v1.discounts.create', set);

            }
        },
        edit: {
            params: {
                discountid: 'objectID',
            },
            async handler(ctx) {

                const discountid = ctx.params.discountid;
                const name = _.trim(ctx.params.name);
                const description = _.trim(ctx.params.description);
                const type = ctx.params.type;
                const placement = ctx.params.placement;
                const period = ctx.params.period;
                const audience = ctx.params.audience;
                const combines = ctx.params.combines;
                const age = ctx.params.age;
                const triggering = ctx.params.triggering;
                const next = ctx.params.next;
                const birthday = ctx.params.birthday;
                const moment = ctx.params.moment;
                const privilege = ctx.params.privilege;
                const condition = ctx.params.condition;

                const set = {};
                set.name = name;
                set.description = description;
                set.type = type;
                set.placement = placement;
                set.audience = audience;
                set.combines = combines;
                set.age = age;
                set.privilege = privilege;
                set.condition = condition;

                const unset = {};
                if (period) {
                    set.period = period;
                } else {
                    unset.period = '';
                }
                if (_.isNumber(triggering) && triggering > 0) {
                    set.triggering = triggering;
                } else {
                    unset.triggering = '';
                }
                if (next) {
                    set.next = next;
                } else {
                    unset.next = '';
                }
                if (birthday) {
                    set.birthday = birthday;
                } else {
                    unset.birthday = '';
                }
                if (moment) {
                    set.moment = moment;
                } else {
                    unset.moment = '';
                }

                const doc = {$set: set};
                if (_.size(unset)) {
                    doc.$unset = unset;
                }

                await ctx.call('v1.discounts.updateOne', {filter: {_id: discountid}, doc});

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
                _.each(ids, (discountid, i) => {
                    ops.push({updateOne: {filter: {_id: discountid}, update: {order: i + 1}}});
                });

                await ctx.call('v1.discounts.bulkWrite', {ops});

            }
        },
        delete: {
            params: {
                discountid: 'objectID',
            },
            async handler(ctx) {

                const discountid = ctx.params.discountid;

                const discount = await ctx.call('v1.discounts.findOne', {conditions: {_id: discountid}});
                if (!discount) {
                    throw new MoleculerServerError(ctx.meta.__('discount-not-found'), 404);
                }

                await ctx.call('v1.discounts.deleteOne', {conditions: {_id: discountid}});

            }
        },
    },
    methods: {
        listToTree(data, options) {

            options = options || {};

            let idKey = options.idKey || 'id';
            let parentKey = options.parentKey || 'parent';
            let childrenKey = options.childrenKey || 'children';
            let tree = _.clone(data);

            const getParent = (rootNode, rootId) => {
                for (let i = 0; i < rootNode.length; i++) {
                    let item = rootNode[i];
                    if (item[idKey] === rootId) {
                        return item;
                    }
                    if (item[childrenKey]) {
                        let childGroup = getParent(item[childrenKey], rootId);
                        if (childGroup) {
                            return childGroup;
                        }
                    }
                }
                return null;
            };

            let len = tree.length - 1;
            for (let i = len; i >= 0; i--) {
                let item = _.clone(tree[i]);
                if (item[parentKey]) {
                    delete tree.splice(i, 1);
                    let parent = getParent(tree, item[parentKey]);
                    if (parent) {
                        if (parent[childrenKey] === undefined) {
                            parent[childrenKey] = [];
                        }
                        parent[childrenKey].unshift(item);
                    }
                }
            }

            return tree;

        },
    },
};
