const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const uniqid = require('uniqid');
const ejs = require('ejs');
const {productCard} = require('../helpers/product');
const {toBrowser} = require('../helpers/delta');
const minifier = require('html-minifier').minify;
const {SitemapStream, streamToPromise} = require('sitemap');
const favicon = fs.readFileSync(path.join(__dirname, '../assets/images/favicon.ico'));
const {parseSync, stringify} = require('svgson');
const {isTest} = require('../helpers/test');
const {cost} = require('../helpers/cost');
const {MoleculerServerError} = require('moleculer').Errors;

const cache = !isTest();

module.exports = {
    name: 'html',
    version: 1,
    events: {
        'content:updated': {
            async handler(ctx) {
                this.broker.cacher.clean('v1.html.**');
            },
        },
    },
    settings: {
        rest: '/',
    },
    actions: {
        // v1.html.main
        main: {
            rest: 'GET /',
            cache: false,
            async handler(ctx) {
                const android = _.get(this.broker.metadata, 'android');
                const ios = _.get(this.broker.metadata, 'ios');
                if (_.startsWith(ctx.meta.hostname, 'apps.')) {
                    if (ctx.meta.agent.isAndroid) {
                        if (!isTest()) {
                            ctx.meta.$statusCode = 301;
                            ctx.meta.$location = android;
                        }
                        return android;
                    } else if (ctx.meta.agent.isiPhone || ctx.meta.agent.isiPad || ctx.meta.agent.isiPod/* || ctx.meta.agent.isMac*/) {
                        if (!isTest()) {
                            ctx.meta.$statusCode = 301;
                            ctx.meta.$location = ios;
                        }
                        return ios;
                    } else {
                        ctx.meta.$responseHeaders = {
                            'Cache-Control': 'public, max-age=3600'
                        };
                        ctx.meta.$responseType = 'text/html';
                        let logo = _.get(this.broker.metadata, 'logo');
                        if (logo) {
                            logo = `/v1/images/${logo}`;
                        } else {
                            logo = '/v1/placeholder/180/30/tile.png';
                        }
                        return this.compile(ctx, 'apps.ejs', {android, ios, logo});
                    }
                } else {
                    if (global.SITE) {
                        return await ctx.call('v1.html.index');
                    } else {
                        return '<p></p>';
                    }
                }
            },
        },
        // v1.html.index
        index: {
            cache,
            async handler(ctx) {

                const showcase = await ctx.call('v1.showcase.data');

                const places = showcase.places;

                const hits = [];
                const products = {};
                _.each(showcase.products, product => {
                    if (_.includes(showcase.hits, product.id)) {
                        hits.push(product);
                    }
                    products[product.id] = product;
                });

                const groups = [];
                _.each(showcase.groups, group => {
                    const _products = [];
                    _.each(group.products, id => {
                        if (products[id]) {
                            _products.push(products[id]);
                        }
                    });
                    group.products = _products;
                    groups.push(group);
                });

                const name = _.get(this.broker.metadata, 'name', '');
                const title = _.get(this.broker.metadata, 'title', ctx.meta.__('home'));
                const description = _.get(this.broker.metadata, 'description', '');
                const keywords = _.get(this.broker.metadata, 'keywords', '');
                const meta = _.get(this.broker.metadata, 'meta', []);
                const favicons = _.get(this.broker.metadata, 'favicons.html', []);

                const javascript = _.get(this.broker.metadata, 'javascript', '');
                const css = _.get(this.broker.metadata, 'css', '');

                const android = _.get(this.broker.metadata, 'android', '#');
                const ios = _.get(this.broker.metadata, 'ios', '#');
                const huawei = _.get(this.broker.metadata, 'huawei', '#');

                let logo = _.get(this.broker.metadata, 'logo');
                if (logo) {
                    logo = `/v1/images/${logo}`;
                } else {
                    logo = '/v1/placeholder/180/30/tile.png';
                }

                let icon = _.get(this.broker.metadata, 'icon');
                if (icon) {
                    icon = `/v1/images/${icon}`;
                } else {
                    icon = '/v1/placeholder/30/30/tile.png';
                }

                let banner = _.get(this.broker.metadata, 'banner');
                if (banner) {
                    banner = `url(/v1/images/${banner})`;
                } else {
                    banner = 'none';
                }

                const socials = _.get(this.broker.metadata, 'socials', []);
                const links = _.get(this.broker.metadata, 'links', []);

                const data = {
                    lang: global.LANG,
                    copyright: ctx.meta.__('copyright', new Date().getFullYear(), name),
                    title,
                    description,
                    keywords,
                    meta,
                    favicons,
                    javascript,
                    css,
                    apps: {
                        android,
                        ios,
                        huawei,
                    },
                    promotions: {
                        items: showcase.promotions,
                        backgroundImage: banner,
                    },
                    agreements: showcase.agreements,
                    balanceEnabled: showcase.balanceEnabled,
                    bonusesEnabled: showcase.bonusesEnabled,
                    groups,
                    hits,
                    places,
                    socials,
                    links,
                    logo,
                    icon,
                };

                return await this.compile(ctx, 'index.ejs', data);
            },
        },
        // v1.html.promotionModal
        promotionModal: {
            rest: 'POST /v1/modals/promotion',
            cache: false,
            params: {
                promotionid: 'objectID',
            },
            async handler(ctx) {
                const promotionid = ctx.params.promotionid;
                const modalid = uniqid.time(`promotion-`);
                const promotion = await ctx.call('v1.promotions.get', {
                    id: promotionid,
                    fields: 'name description text banner'
                });
                if (!promotion) {
                    throw new MoleculerServerError(ctx.meta.__('promotion-not-found'), 404);
                }
                const data = {
                    modalid,
                    name: promotion.name,
                    banner: promotion.banner,
                    text: promotion.text ? toBrowser(promotion.text) : promotion.description,
                };
                return {
                    modalid,
                    html: await this.compile(ctx, 'modals/promotion.ejs', data),
                };
            },
        },
        // v1.html.agreementModal
        agreementModal: {
            rest: 'POST /v1/modals/agreement',
            cache: false,
            params: {
                agreementid: 'objectID',
            },
            async handler(ctx) {
                const agreementid = ctx.params.agreementid;
                const modalid = uniqid.time(`agreement-`);
                const agreement = await ctx.call('v1.agreements.get', {id: agreementid, fields: 'name text'});
                if (!agreement) {
                    throw new MoleculerServerError(ctx.meta.__('agreement-not-found'), 404);
                }
                const data = {
                    modalid,
                    name: agreement.name,
                    text: toBrowser(agreement.text),
                };
                return {
                    modalid,
                    html: await this.compile(ctx, 'modals/agreement.ejs', data),
                };
            },
        },
        // v1.html.signInModal
        signInModal: {
            rest: 'POST /v1/modals/sign-in',
            cache: false,
            async handler(ctx) {
                const modalid = uniqid.time(`sign-in-`);
                const data = {
                    modalid,
                    phone: isTest() ? '79150460101' : '',
                };
                return {
                    modalid,
                    html: await this.compile(ctx, 'modals/sign-in.ejs', data),
                };
            },
        },
        // v1.html.otpModal
        otpModal: {
            rest: 'POST /v1/modals/otp',
            cache: false,
            async handler(ctx) {
                const modalid = uniqid.time(`otp-`);
                const data = {
                    modalid,
                };
                return {
                    modalid,
                    html: await this.compile(ctx, 'modals/otp.ejs', data),
                };
            },
        },
        // v1.html.profileModal
        profileModal: {
            rest: 'POST /v1/modals/profile',
            cache: false,
            params: {
                customerid: 'objectID',
            },
            async handler(ctx) {
                const modalid = uniqid.time(`profile-`);
                const customerid = ctx.params.customerid;
                const customer = await ctx.call('v1.customers.get', {
                    id: customerid,
                    fields: 'name phone email avatar'
                });
                if (!customer) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }
                const data = {
                    modalid,
                    name: _.get(customer, 'name', ''),
                    phone: _.get(customer, 'phone', ''),
                    email: _.get(customer, 'email', ''),
                    avatar: `/v1/images/avatar/150/${_.get(customer, 'avatar', 'no-avatar.png')}`,
                };
                return {
                    modalid,
                    html: await this.compile(ctx, 'modals/profile.ejs', data),
                };
            },
        },
        // v1.html.balanceModal
        balanceModal: {
            rest: 'POST /v1/modals/balance',
            cache: false,
            params: {
                customerid: 'objectID',
            },
            async handler(ctx) {
                const modalid = uniqid.time(`balance-`);
                const customerid = ctx.params.customerid;
                const customer = await ctx.call('v1.customers.get', {id: customerid, fields: 'balance'});
                if (!customer) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }
                const data = {
                    modalid,
                    balance: _.get(customer, 'balance', 0),
                };
                return {
                    modalid,
                    html: await this.compile(ctx, 'modals/balance.ejs', data),
                };
            },
        },
        // v1.html.bonusModal
        bonusModal: {
            rest: 'POST /v1/modals/bonus',
            cache: false,
            params: {
                customerid: 'objectID',
            },
            async handler(ctx) {
                const modalid = uniqid.time(`bonuses-`);
                const customerid = ctx.params.customerid;
                const customer = await ctx.call('v1.customers.get', {id: customerid, fields: 'bonuses'});
                if (!customer) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }
                const data = {
                    modalid,
                    bonuses: Math.ceil(_.get(customer, 'bonuses', 0)),
                };
                return {
                    modalid,
                    html: await this.compile(ctx, 'modals/bonus.ejs', data),
                };
            },
        },
        // v1.html.ordersModal
        ordersModal: {
            rest: 'POST /v1/modals/orders',
            cache: false,
            params: {
                customerid: 'objectID',
            },
            async handler(ctx) {
                const modalid = uniqid.time(`orders-`);
                const customerid = ctx.params.customerid;
                const customer = await ctx.call('v1.customers.get', {id: customerid, fields: 'name'});
                if (!customer) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }
                const _orders = await ctx.call('v1.orders.orders', {customerid: customerid});
                const orders = [];
                _.each(_orders, order => {
                    const description = [];
                    _.each(order.items, item => {
                        description.push(`${item.name} ${item.quantity} x ${cost(item.amount)} = ${cost(item.quantity * item.amount)}`);
                    });
                    orders.push({
                        id: order.id,
                        date: order.date,
                        amount: cost(order.amount),
                        paid: order.paid,
                        description: _.join(description, '<br>'),
                    });
                });
                const data = {
                    modalid,
                    orders,
                    dateFormat: ctx.meta.__('date-and-time-format'),
                };
                return {
                    modalid,
                    html: await this.compile(ctx, 'modals/orders.ejs', data),
                };
            },
        },
        // v1.html.bonusesModal
        bonusesModal: {
            rest: 'POST /v1/modals/bonuses',
            cache: false,
            params: {
                customerid: 'objectID',
            },
            async handler(ctx) {
                const modalid = uniqid.time(`bonuses-`);
                const customerid = ctx.params.customerid;
                const customer = await ctx.call('v1.customers.get', {id: customerid, fields: 'name'});
                if (!customer) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }
                const _bonuses = await ctx.call('v1.customer-bonuses.items', {customerid: customerid});
                const bonuses = [];
                _.each(_bonuses, bonuse => {
                    bonuses.push({
                        id: bonuse.id,
                        date: bonuse.date,
                        amount: Math.ceil(bonuse.amount),
                        plus: bonuse.amount > 0,
                    });
                });
                const data = {
                    modalid,
                    bonuses,
                    dateFormat: ctx.meta.__('date-and-time-format'),
                };
                return {
                    modalid,
                    html: await this.compile(ctx, 'modals/bonuses.ejs', data),
                };
            },
        },
        // v1.html.balancesModal
        balancesModal: {
            rest: 'POST /v1/modals/balances',
            cache: false,
            params: {
                customerid: 'objectID',
            },
            async handler(ctx) {
                const modalid = uniqid.time(`balances-`);
                const customerid = ctx.params.customerid;
                const customer = await ctx.call('v1.customers.get', {id: customerid, fields: 'name'});
                if (!customer) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }
                const _balances = await ctx.call('v1.customer-balances.items', {customerid: customerid});
                const balances = [];
                _.each(_balances, balance => {
                    balances.push({
                        id: balance.id,
                        date: balance.date,
                        amount: cost(balance.amount),
                        plus: balance.amount > 0,
                    });
                });
                const data = {
                    modalid,
                    balances,
                    dateFormat: ctx.meta.__('date-and-time-format'),
                };
                return {
                    modalid,
                    html: await this.compile(ctx, 'modals/balances.ejs', data),
                };
            },
        },
        // v1.html.wishlistModal
        wishlistModal: {
            rest: 'POST /v1/modals/wishlist',
            cache: false,
            params: {
                ids: 'array',
            },
            async handler(ctx) {
                const units = await ctx.call('v1.units.get');
                const modalid = uniqid.time(`wishlist-`);
                const ids = ctx.params.ids;
                const _products = await this.broker.call('v1.products.find', {query: {_id: {$in: ids}}});
                if (_.size(_products) === 0) {
                    throw new MoleculerServerError(ctx.meta.__('products-not-found'), 404);
                }
                const products = [];
                _.each(_products, product => {
                    products.push(productCard(product, units));
                });
                const data = {
                    modalid,
                    products,
                };
                return {
                    modalid,
                    html: await this.compile(ctx, 'modals/wishlist.ejs', data),
                };
            },
        },
        // v1.html.supportModal
        supportModal: {
            rest: 'POST /v1/modals/support',
            cache: false,
            params: {
                customerid: {
                    type: 'objectID',
                    optional: true,
                },
            },
            async handler(ctx) {
                const modalid = uniqid.time(`support-`);
                const data = {
                    modalid,
                    name: '',
                    phone: '',
                    email: '',
                };
                const customerid = ctx.params.customerid;
                if (customerid) {
                    const customer = await ctx.call('v1.customers.get', {id: customerid, fields: 'name phone email'});
                    if (customer) {
                        data.name = _.get(customer, 'name', '');
                        data.phone = _.get(customer, 'phone', '');
                        data.email = _.get(customer, 'email', '');
                    }
                }
                return {
                    modalid,
                    html: await this.compile(ctx, 'modals/support.ejs', data),
                };
            },
        },
        // v1.html.placesModal
        placesModal: {
            rest: 'POST /v1/modals/places',
            cache: false,
            async handler(ctx) {
                const modalid = uniqid.time(`places-`);
                let iconUrl = _.get(this.broker.metadata, 'marker');
                if (iconUrl) {
                    iconUrl = `/v1/images/${iconUrl}`;
                }
                const data = {
                    modalid,
                    iconUrl,
                };
                return {
                    modalid,
                    html: await this.compile(ctx, 'modals/places.ejs', data),
                };
            },
        },
        // v1.html.scheduleModal
        scheduleModal: {
            rest: 'POST /v1/modals/schedule',
            cache: false,
            params: {
                placeid: 'objectID',
            },
            async handler(ctx) {
                const modalid = uniqid.time(`schedule-`);
                const placeid = ctx.params.placeid;
                const workTime = await ctx.call('v1.places.workTime', {placeid});
                const data = {
                    modalid,
                    days: workTime.days,
                };
                return {
                    modalid,
                    html: await this.compile(ctx, 'modals/schedule.ejs', data),
                };
            },
        },
        // v1.html.contactsModal
        contactsModal: {
            rest: 'POST /v1/modals/contacts',
            cache: false,
            params: {
                placeid: 'objectID',
            },
            async handler(ctx) {

                const modalid = uniqid.time(`contacts-`);
                const placeid = ctx.params.placeid;

                const place = await ctx.call('v1.places.get', {id: placeid, fields: 'name phone coordinates'});
                if (!place) {
                    throw new MoleculerServerError(ctx.meta.__('place-not-found'), 404);
                }

                let iconUrl = _.get(this.broker.metadata, 'marker');
                if (iconUrl) {
                    iconUrl = `/v1/images/${iconUrl}`;
                }

                const data = {
                    modalid,
                    address: place.name,
                    phone: place.phone,
                    coordinates: place.coordinates,
                    iconUrl,
                };
                return {
                    modalid,
                    html: await this.compile(ctx, 'modals/contacts.ejs', data),
                };
            },
        },
        // v1.html.productModal
        productModal: {
            rest: 'POST /v1/modals/product',
            cache: false,
            params: {
                productid: 'objectID',
            },
            async handler(ctx) {
                const units = await ctx.call('v1.units.get');
                const modalid = uniqid.time(`product-`);
                const productid = ctx.params.productid;

                const product = await ctx.call('v1.products.get', {id: productid});
                if (!product) {
                    throw new MoleculerServerError(ctx.meta.__('product-not-found'), 404);
                }

                const prices = [];
                _.each(product.prices, price => {
                    price.name = `${price.value} ${units[price.type]}`;
                    price.picture = _.get(price, 'picture', product.gallery[0].picture);
                    prices.push(price);
                });

                const modifiers = [];
                if (_.size(product.modifiers)) {
                    const _modifiers = await this.broker.call('v1.modifiers.find', {query: {_id: {$in: product.modifiers}}, fields: '_id name picture'});
                    _.each(_modifiers, modifier => {
                        modifiers.push({
                            id: modifier._id.toString(),
                            name: modifier.name,
                            picture: _.get(modifier, 'picture', 'no-photo.png'),
                        });
                    });
                }

                const stickers = [];
                if (_.size(product.stickers)) {
                    _.each(product.stickers, sticker => {
                        stickers.push({
                            name: sticker.name,
                            color: sticker.color.hex,
                        });
                    });
                }

                const ingredients = [];
                if (_.size(product.ingredients)) {
                    const _ingredients = await this.broker.call('v1.ingredients.find', {query: {_id: {$in: product.ingredients}}, fields: '_id name'});
                    _.each(_ingredients, ingredient => {
                        ingredients.push(_.toLower(ingredient.name));
                    });
                }

                const data = {
                    modalid,
                    id: product._id.toString(),
                    name: product.name,
                    description: _.get(product, 'description', ''),
                    picture: product.gallery[0].picture,
                    prices: _.sortBy(prices, ['price']),
                    modifiers,
                    stickers,
                    ingredients: _.join(ingredients, ', '),
                };
                return {
                    modalid,
                    html: await this.compile(ctx, 'modals/product.ejs', data),
                };
            },
        },
        // v1.html.modifierModal
        modifierModal: {
            rest: 'POST /v1/modals/modifier',
            cache: false,
            params: {
                modifierid: 'objectID',
            },
            async handler(ctx) {
                const units = await ctx.call('v1.units.get');
                const modalid = uniqid.time(`modifier-`);
                const modifierid = ctx.params.modifierid;
                const modifier = await ctx.call('v1.modifiers.get', {id: modifierid});
                if (!modifier) {
                    throw new MoleculerServerError(ctx.meta.__('modifier-not-found'), 404);
                }
                const items = [];
                _.each(modifier.items, item => {
                    items.push({
                        id: item._id.toString(),
                        name: item.name,
                        description: `${item.value} ${units[item.type]}`,
                        picture: item.picture,
                        price: item.price,
                    });
                });
                const data = {
                    modalid,
                    name: modifier.name,
                    items,
                };
                return {
                    modalid,
                    html: await this.compile(ctx, 'modals/modifier.ejs', data),
                };
            },
        },
        // v1.html.cartModal
        cartModal: {
            rest: 'POST /v1/modals/cart',
            cache: false,
            params: {
                order: 'array',
                placeid: 'objectID',
                customerid: {
                    type: 'objectID',
                    optional: true,
                },
            },
            async handler(ctx) {

                const units = await ctx.call('v1.units.get');
                const modalid = 'cart-modal';
                const orderItems = ctx.params.order;

                let customer;
                const customerid = ctx.params.customerid;
                if (customerid) {
                    customer = await ctx.call('v1.customers.get', {id: customerid, fields: 'balance bonuses'});
                }

                const placeid = ctx.params.placeid;
                const place = await ctx.call('v1.places.get', {id: placeid, fields: 'delivery pickup inside'});
                if (!place) {
                    throw new MoleculerServerError(ctx.meta.__('place-not-found'), 404);
                }

                const items = [];
                let amount = 0;

                const products = {};
                const productids = [];
                const modifiers = {};
                const modifierids = [];
                // собираем идентификаторы
                _.each(orderItems, orderItem => {
                    productids.push(orderItem.productid);
                    _.each(orderItem.modifiers, (modifier) => {
                        modifierids.push(modifier.id);
                    });
                });
                // собираем модификаторы
                if (_.size(modifierids)) {
                    const _modifiers = await this.broker.call('v1.modifiers.find', {
                        query: {'items._id': {$in: modifierids}},
                    });
                    _.each(_modifiers, modifier => {
                        _.each(modifier.items, item => {
                            modifiers[item._id.toString()] = item;
                        });
                    });
                }
                // собираем товары
                if (_.size(productids)) {
                    const _products = await this.broker.call('v1.products.find', {
                        query: {_id: {$in: productids}},
                        sort: 'order',
                        fields: '_id name gallery prices',
                    });
                    _.each(_products, product => {
                        products[product._id.toString()] = product;
                    });
                }
                // собираем заказ
                _.each(orderItems, orderItem => {
                    const product = products[orderItem.productid];
                    if (product) {
                        let priceid = orderItem.priceid;
                        let productPrice = product.prices[0];
                        _.each(product.prices, priceItem => {
                            const parts = _.split(orderItem.priceid, '-');
                            if (_.size(parts) > 1) {
                                priceid = parts[0];
                            }
                            if (priceItem.id === priceid) {
                                productPrice = priceItem;
                                return false;
                            }
                        });
                        let _amount = _.get(orderItem, 'amount', productPrice.price);
                        const push = {
                            id: orderItem.priceid,
                            name: `${product.name} (${productPrice.value} ${units[productPrice.type]})`,
                            price: productPrice.price,
                            picture: productPrice.picture || product.gallery[0].picture,
                            quantity: orderItem.quantity,
                            description: '',
                        };
                        if (_.size(orderItem.modifiers)) {
                            const description = [];
                            const orderModifiers = orderItem.modifiers;
                            _.each(orderModifiers, (orderModifier, modifierid) => {
                                const modifier = modifiers[modifierid];
                                if (modifier) {
                                    _amount += orderModifier.quantity * modifier.price;
                                    description.push(`${modifier.name} ${orderModifier.quantity} x ${cost(modifier.price)} = ${cost(orderModifier.quantity * modifier.price)}`);
                                }
                            });
                            push.description = `${_.join(description, '')}.`;
                        }
                        push.amount = _amount * orderItem.quantity;
                        amount += push.amount;
                        items.push(push);
                    }
                });

                const paymentMethods = [];
                const _paymentMethods = await ctx.call('v1.payment-methods.find', {sort: 'order', query: {placement: {$ne: 'app'}, test: isTest()}});
                _.each(_paymentMethods, paymentMethod => {
                    const type = paymentMethod.type;
                    let name = paymentMethod.name;
                    if (customer) {
                        switch (type) {
                            case 'balance':
                                name += ` • ${cost(customer.balance)}`;
                                break;
                            case 'bonuses':
                                name += ` • ${customer.bonuses}`;
                                break;
                        }
                    }
                    paymentMethods.push({
                        id: paymentMethod._id.toString(),
                        type,
                        name,
                    });
                });

                const additionals = [];
                const _products = await ctx.call('v1.products.find', {query: {additional: true}, sort: 'order'});
                _.each(_products, product => {
                    additionals.push(productCard(product, units));
                });

                const obtaining = [];
                if (place.delivery) {
                    obtaining.push('delivery');
                }
                if (place.pickup) {
                    obtaining.push('pickup');
                }
                if (place.inside) {
                    obtaining.push('inside');
                }

                const data = {
                    modalid,
                    items,
                    amount,
                    additionals,
                    paymentMethods,
                    obtaining,
                };
                return {
                    modalid,
                    html: await this.compile(ctx, 'modals/cart.ejs', data),
                };
            },
        },
        // v1.html.successModal
        successModal: {
            rest: 'POST /v1/modals/success',
            cache: false,
            async handler(ctx) {
                const modalid = uniqid.time(`success-`);
                const data = {
                    modalid,
                };
                return {
                    modalid,
                    html: await this.compile(ctx, 'modals/success.ejs', data),
                };
            },
        },
        // v1.html.failModal
        failModal: {
            rest: 'POST /v1/modals/fail',
            cache: false,
            async handler(ctx) {
                const modalid = uniqid.time(`fail-`);
                const data = {
                    modalid,
                };
                return {
                    modalid,
                    html: await this.compile(ctx, 'modals/fail.ejs', data),
                };
            },
        },
        // v1.html.rechargeModal
        rechargeModal: {
            rest: 'POST /v1/modals/recharge',
            cache: false,
            params: {
                customerid: 'objectID',
            },
            async handler(ctx) {

                const modalid = uniqid.time(`recharge-`);
                const paymentMethods = [];
                const _paymentMethods = await ctx.call('v1.payment-methods.find', {sort: 'order', query: {placement: {$ne: 'app'}, test: isTest()}});
                _.each(_paymentMethods, paymentMethod => {
                    const type = paymentMethod.type;
                    if (type !== 'balance' && type !== 'bonuses') {
                        paymentMethods.push({
                            id: paymentMethod._id.toString(),
                            type,
                            name: paymentMethod.name,
                        });
                    }
                });

                const amounts = await ctx.call('v1.balances.amounts');

                const data = {
                    modalid,
                    paymentMethods,
                    amounts,
                };

                return {
                    modalid,
                    html: await this.compile(ctx, 'modals/recharge.ejs', data),
                };
            },
        },
        // v1.html.favicon
        favicon: {
            rest: 'GET /favicon.ico',
            cache,
            async handler(ctx) {
                return favicon;
            }
        },
        // v1.html.manifest
        manifest: {
            rest: 'GET /manifest.json',
            cache,
            async handler(ctx) {
                return {
                    "name": "admin",
                    "short_name": "admin",
                    "description": "admin",
                    "lang": "en-US",
                    "start_url": "/office/",
                    "display": "standalone",
                    "background_color": "#000000",
                    "theme_color": "#000000",
                    "content_security_policy": "script-src 'self' 'unsafe-eval'; object-src 'self'",
                    "icons": [
                        {
                            "src": "/v1/images/image/128/icon-ios.png",
                            "sizes": "128x128",
                            "type": "image/png"
                        },
                        {
                            "src": "/v1/images/image/144/icon-ios.png",
                            "sizes": "144x144",
                            "type": "image/png"
                        },
                        {
                            "src": "/v1/images/image/152/icon-ios.png",
                            "sizes": "152x152",
                            "type": "image/png"
                        },
                        {
                            "src": "/v1/images/image/192/icon-ios.png",
                            "sizes": "192x192",
                            "type": "image/png"
                        },
                        {
                            "src": "/v1/images/image/256/icon-ios.png",
                            "sizes": "256x256",
                            "type": "image/png"
                        },
                        {
                            "src": "/v1/images/image/512/icon-ios.png",
                            "sizes": "512x512",
                            "type": "image/png"
                        }
                    ]
                };
            }
        },
        // v1.html.badBrowser
        badBrowser: {
            rest: 'GET /badbrowser',
            cache,
            async handler(ctx) {
                const data = {
                    title: ctx.meta.__('badbrowser-title'),
                    message: ctx.meta.__('badbrowser-message'),
                };
                return await this.compile(ctx, 'badbrowser.ejs', data);
            }
        },
        // v1.html.robots
        robots: {
            rest: 'GET /robots.txt',
            cache,
            async handler(ctx) {
                let str = 'User-agent: *';
                str += '\n';
                str += 'Allow: /';
                str += '\n';
                str += 'Disallow: /my/';
                str += '\n';
                str += 'Crawl-delay: 7';
                str += '\n';
                str += `Host: https://${ctx.meta.hostname}`;
                str += '\n';
                str += `Sitemap: https://${ctx.meta.hostname}/sitemap.xml`;
                return str;
            }
        },
        // v1.html.sitemap
        sitemap: {
            rest: 'GET /sitemap.xml',
            cache,
            async handler(ctx) {
                const sitemap = new SitemapStream({hostname: `https://${ctx.meta.hostname}`, cacheTime: 1});
                const add = (value) => {
                    sitemap.write({url: value, changefreq: 'weekly'});
                };
                add('/');
                sitemap.end();
                return await streamToPromise(sitemap);
            }
        },
        // v1.html.notFound
        notFound: {
            cache,
            async handler(ctx) {
                ctx.meta.$statusCode = 404;
                return await this.compile(ctx, 'not-found.ejs');
            }
        },
        // v1.html.ok
        ok: {
            rest: 'GET /ok',
            cache,
            async handler(ctx) {
                return '<p>ok</p>';
            },
        },
    },
    methods: {
        async compile(ctx, file, data = {}) {
            const template = path.join(__dirname, '..', 'views', file);
            const context = {
                __: ctx.meta.__,
                icon: this.icon,
                cost: (obj) => {
                    let str = cost(_.isArray(obj) ? obj[0].price : obj);
                    if (_.isArray(obj) && _.size(obj) > 1) {
                        str = `${ctx.meta.__('from')} ${str}`;
                    }
                    return str;
                }
            };
            return new Promise((resolve, reject) => {
                ejs.renderFile(template, data, {context}, (err, html) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.minify(html));
                    }
                });
            });
        },
        icon(name, params = {}) {
            const src = path.join(__dirname, `../assets/svgs/${name}.svg`);
            const data = fs.readFileSync(src, 'utf-8');
            const obj = parseSync(data);
            _.set(obj, 'children[0].attributes.fill', 'currentColor');
            const $class = ['svg-inline--fa', `fa-${name}`, 'fa-w-16'];
            if (params.size) {
                $class.push(`fa-${params.size}`);
            }
            if (params.fixedWidth === true || params.fixedWidth === undefined) {
                $class.push('fa-fw');
            }
            if (params.rotate) {
                $class.push(`fa-rotate-${params.rotate}`);
            }
            if (params.flip) {
                $class.push(`fa-flip-${params.flip}`);
            }
            switch (params.animation) {
                case 'spin':
                    $class.push('fa-spin');
                    break;
                case 'pulse':
                    $class.push('fa-pulse');
                    break;
            }
            if ($class.border) {
                $class.push('fa-border');
            }
            _.set(obj, 'attributes.class', _.join($class, ' '));
            return stringify(obj);
        },
        minify(html) {
            if (isTest()) {
                return html;
            }
            html = html.replace(/data-aos(.*)=""/g, '');
            html = html.replace(/data-rellax-speed=""/g, '');
            html = html.replace(/data-base=""/g, '');
            html = html.replace(/data-aspect=""/g, '');
            html = html.replace(/name=""/g, '');
            html = html.replace(/min=""/g, '');
            html = html.replace(/max=""/g, '');
            html = html.replace(/step=""/g, '');
            html = html.replace(/size=""/g, '');
            html = html.replace(/width=""/g, '');
            html = html.replace(/height=""/g, '');
            return minifier(html, {
                removeComments: true,
                collapseWhitespace: true,
                collapseBooleanAttributes: true,
                removeAttributeQuotes: false,
                removeEmptyAttributes: true,
                minifyJS: true,
                minifyCSS: true,
            });
        },
    }
};
