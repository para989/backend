const ApiService = require('moleculer-web');
const auth = require('basic-auth');
const _ = require('lodash');
const {MoleculerServerError} = require('moleculer').Errors;
const isHtml = require('is-html');
const mime = require('mime-types');
const fileExtension = require('file-extension');
const {isTest} = require('../helpers/test');

const bodyParsers = {
    json: {
        limit: '2MB',
    },
    urlencoded: {
        extended: true,
        limit: '2MB',
    },
};

const use = [
    async function (req, res, next) {
        /* i18n */
        req.$ctx.meta.__ = req.__;
        req.$ctx.meta.__n = req.__n;
        req.$ctx.meta.__mf = req.__mf;
        req.$ctx.meta.__l = req.__l;
        req.$ctx.meta.__h = req.__h;
        req.$ctx.meta.getLocale = req.getLocale;
        /* ip */
        req.$ctx.meta.ip = req.clientIp;
        /* useragent */
        req.$ctx.meta.agent = req.useragent;
        /* headers */
        req.$ctx.meta.headers = req.headers;
        /* hostname */
        req.$ctx.meta.hostname = req.hostname;
        req.$ctx.meta.url = isTest() ? `http://${req.hostname}:4000/` : `https://${req.hostname}/`;
        next();
    }
];

function onAfterCall(ctx, route, req, res, data) {
    if (data) {
        if (_.isPlainObject(data) && _.get(data, 'redirect')) {
            ctx.meta.$statusCode = 301;
            ctx.meta.$location = data.redirect;
        } else {
            const contentType = mime.lookup(req.path);
            if (contentType) {
                ctx.meta.$responseType = contentType;
                if (_.size(ctx.meta.$responseHeaders) === 0) {
                    let ext = fileExtension(req.path);
                    let maxAge = 31536000;
                    if (_.includes(['css', 'xml', 'text'], ext)) {
                        maxAge = 3600;
                    }
                    ctx.meta.$responseHeaders = {
                        'Cache-Control': `public, max-age=${maxAge}`
                    };
                }
            } else if (isHtml(data)) {
                ctx.meta.$responseType = 'text/html';
                if (_.size(ctx.meta.$responseHeaders) === 0) {
                    ctx.meta.$responseHeaders = {
                        'Cache-Control': 'public, max-age=3600'
                    };
                }
            }
        }
    }
    return data;
}

const mappingPolicy = 'restrict';

module.exports = {
    name: 'www',
    version: 1,
    mixins: [ApiService],
    settings: {
        server: false,
        optimizeOrder: false,
        routes: [
            {
                path: '/v1/user',
                mappingPolicy,
                authentication: true,
                bodyParsers,
                use,
                autoAliases: false,
                aliases: {
                    /* images */
                    "POST /image/crop": "v1.images.crop",
                    "POST /image/video": "v1.images.video",
                    /* places */
                    "GET /places": "v1.places.items",
                    "GET /place/:placeid": "v1.places.item",
                    "POST /place": "v1.places.add",
                    "PATCH /place": "v1.places.edit",
                    "DELETE /place/:placeid": "v1.places.delete",
                    /* city */
                    "GET /city": "v1.cities.search",
                    /* groups */
                    "GET /groups/items": "v1.groups.items",
                    "GET /groups/items/:groupid": "v1.groups.items",
                    "GET /groups/tree/:groupid": "v1.groups.tree",
                    "GET /groups/list": "v1.groups.list",
                    "PUT /groups/sort": "v1.groups.sort",
                    "PUT /groups/move": "v1.groups.move",
                    "GET /group/:groupid": "v1.groups.item",
                    "POST /group": "v1.groups.add",
                    "PATCH /group": "v1.groups.edit",
                    "DELETE /group/:groupid": "v1.groups.delete",
                    "GET /update-catalog": "v1.groups.updateCatalog",
                    /* product */
                    "GET /product/:productid": "v1.products.item",
                    "POST /product": "v1.products.add",
                    "PATCH /product": "v1.products.edit",
                    "PUT /products/sort": "v1.products.sort",
                    "DELETE /product/:productid": "v1.products.delete",
                    /* stickers */
                    "GET /stickers": "v1.stickers.items",
                    "GET /sticker/:stickerid": "v1.stickers.item",
                    "POST /sticker": "v1.stickers.add",
                    "PATCH /sticker": "v1.stickers.edit",
                    "PUT /stickers": "v1.stickers.sort",
                    "DELETE /sticker/:stickerid": "v1.stickers.delete",
                    /* ingredients */
                    "GET /ingredients": "v1.ingredients.items",
                    "GET /ingredient/:ingredientid": "v1.ingredients.item",
                    "POST /ingredient": "v1.ingredients.add",
                    "PATCH /ingredient": "v1.ingredients.edit",
                    "PUT /ingredients": "v1.ingredients.sort",
                    "DELETE /ingredient/:ingredientid": "v1.ingredients.delete",
                    /* domains */
                    "GET /domains": "v1.domains.items",
                    "GET /domain/:domainid": "v1.domains.item",
                    "POST /domain": "v1.domains.add",
                    "PATCH /domain": "v1.domains.edit",
                    "DELETE /domain/:domainid": "v1.domains.delete",
                    /* payment-methods */
                    "GET /payment-methods": "v1.payment-methods.items",
                    "GET /payment-method/:methodid": "v1.payment-methods.item",
                    "POST /payment-method": "v1.payment-methods.add",
                    "PATCH /payment-method": "v1.payment-methods.edit",
                    "PUT /payment-methods": "v1.payment-methods.sort",
                    "DELETE /payment-method/:methodid": "v1.payment-methods.delete",
                    /* modifiers */
                    "GET /modifiers": "v1.modifiers.getGroups",
                    "GET /modifier/:groupid": "v1.modifiers.getGroup",
                    "POST /modifier": "v1.modifiers.addGroup",
                    "PATCH /modifier": "v1.modifiers.editGroup",
                    "PUT /modifiers": "v1.modifiers.sortGroup",
                    "DELETE /modifier/:groupid": "v1.modifiers.deleteGroup",
                    "GET /modifier/items/:groupid": "v1.modifiers.getItems",
                    "GET /modifier/item/:groupid/:itemid": "v1.modifiers.getItem",
                    "POST /modifier/item": "v1.modifiers.addItem",
                    "PATCH /modifier/item": "v1.modifiers.editItem",
                    "PUT /modifier/items": "v1.modifiers.sortItem",
                    "DELETE /modifier/item/:groupid/:itemid": "v1.modifiers.deleteItem",
                    /* orders */
                    "GET /orders/:status": "v1.orders.items",
                    "GET /order/item/:orderid": "v1.orders.item",
                    "GET /order/products": "v1.orders.products",
                    "GET /order/product/:productid": "v1.orders.product",
                    "GET /orders/filter": "v1.orders.filter",
                    "POST /order": "v1.orders.add",
                    "PATCH /order": "v1.orders.edit",
                    "PATCH /order/status": "v1.orders.status",
                    "PATCH /order/progress": "v1.orders.setProgress",
                    "DELETE /order/progress/:orderid/:index": "v1.orders.revokeProgress",
                    "POST /report": "v1.orders.createReport",
                    "PUT /order/test": "v1.orders.test",
                    /* sold out */
                    "GET /sold-out": "v1.sold-out.items",
                    "POST /sold-out": "v1.sold-out.add",
                    "DELETE /sold-out/:productid": "v1.sold-out.delete",
                    /* promotions */
                    "GET /promotions": "v1.promotions.items",
                    "GET /promotion/:promotionid": "v1.promotions.item",
                    "POST /promotion": "v1.promotions.add",
                    "PATCH /promotion": "v1.promotions.edit",
                    "PUT /promotions": "v1.promotions.sort",
                    "DELETE /promotion/:promotionid": "v1.promotions.delete",
                    /* promo codes */
                    "GET /promocodes": "v1.promocodes.items",
                    "GET /promocode/:promocodeid": "v1.promocodes.item",
                    "POST /promocode": "v1.promocodes.add",
                    "PATCH /promocode": "v1.promocodes.edit",
                    "PUT /promocodes": "v1.promocodes.sort",
                    "DELETE /promocode/:promocodeid": "v1.promocodes.delete",
                    /* seasons */
                    "GET /seasons": "v1.seasons.items",
                    "GET /season/:seasonid": "v1.seasons.item",
                    "POST /season": "v1.seasons.add",
                    "PATCH /season": "v1.seasons.edit",
                    "PUT /seasons": "v1.seasons.sort",
                    "DELETE /season/:seasonid": "v1.seasons.delete",
                    /* gifts */
                    "GET /gifts": "v1.gifts.items",
                    "GET /gift/:giftid": "v1.gifts.item",
                    "POST /gift": "v1.gifts.add",
                    "PATCH /gift": "v1.gifts.edit",
                    "PUT /gifts": "v1.gifts.sort",
                    "DELETE /gift/:giftid": "v1.gifts.delete",
                    "POST /gift/charge": "v1.customer-gifts.charge",
                    /* customers */
                    "GET /customers": "v1.customers.items",
                    "GET /customer/:customerid": "v1.customers.item",
                    "POST /customer": "v1.customers.add",
                    "PATCH /customer": "v1.customers.edit",
                    "DELETE /customer/:customerid": "v1.customers.delete",
                    /* users */
                    "GET /auth": "v1.users.verifyUser",
                    "DELETE /auth": "v1.users.signOut",
                    "PATCH /password": "v1.users.changePassword",
                    "PATCH /profile": "v1.users.setProfile",
                    "GET /users": "v1.users.getUsers",
                    "GET /user/:userid": "v1.users.getUser",
                    "POST /user": "v1.users.addUser",
                    "PATCH /user": "v1.users.editUser",
                    "DELETE /user/:userid": "v1.users.deleteUser",
                    "GET /questionnaire/:userid": "v1.users.getQuestionnaire",
                    "PATCH /questionnaire": "v1.users.setQuestionnaire",
                    /* agreements */
                    "GET /agreements": "v1.agreements.items",
                    "GET /agreement/:agreementid": "v1.agreements.item",
                    "POST /agreement": "v1.agreements.add",
                    "PATCH /agreement": "v1.agreements.edit",
                    "PUT /agreements": "v1.agreements.sort",
                    "DELETE /agreement/:agreementid": "v1.agreements.delete",
                    /* reviews */
                    "GET /reviews": "v1.reviews.items",
                    "POST /review": "v1.reviews.add",
                    "DELETE /review/:reviewid": "v1.reviews.delete",
                    /* forms */
                    "GET /form/:type": "v1.forms.item",
                    "PATCH /form": "v1.forms.edit",
                    "DELETE /form/:type": "v1.forms.delete",
                    /* config */
                    "GET /config/basic": "v1.config.getBasic",
                    "PATCH /config/basic": "v1.config.setBasic",

                    "GET /config/maps": "v1.config.getMaps",
                    "PATCH /config/maps": "v1.config.setMaps",

                    "GET /config/storage": "v1.config.getStorage",
                    "PATCH /config/storage": "v1.config.setStorage",
                    "GET /config/apps": "v1.config.getApps",
                    "PATCH /config/apps": "v1.config.setApps",
                    "GET /config/cashback": "v1.config.getCashback",
                    "PATCH /config/cashback": "v1.config.setCashback",
                    "GET /config/socials": "v1.config.getSocials",
                    "PATCH /config/socials": "v1.config.setSocials",
                    "GET /config/site": "v1.config.getSite",
                    "PATCH /config/site": "v1.config.setSite",
                    "GET /config/theme": "v1.config.getTheme",
                    "PATCH /config/theme": "v1.config.setTheme",
                    "GET /config/email": "v1.config.getEmail",
                    "PATCH /config/email": "v1.config.setEmail",
                    "GET /config/call": "v1.config.getCall",
                    "PATCH /config/call": "v1.config.setCall",
                    "GET /config/bot": "v1.config.getBot",
                    "PATCH /config/bot": "v1.config.setBot",
                    "GET /config/notification": "v1.config.getNotification",
                    "PATCH /config/notification": "v1.config.setNotification",
                    "GET /config/sms": "v1.config.getSms",
                    "PATCH /config/sms": "v1.config.setSms",
                }
            },
            {
                path: '/v1/user/upload',
                mappingPolicy,
                authentication: true,
                bodyParsers: {
                    json: false,
                    urlencoded: false,
                },
                busboyConfig: {
                    limits: {
                        files: 5
                    },
                },
                use: [
                    function (req, res, next) {
                        req.$ctx.meta.headers = req.headers;
                        next();
                    }
                ],
                autoAliases: false,
                aliases: {
                    "POST /photo": "multipart:v1.images.photo",
                    "POST /avatar": "multipart:v1.images.avatar",
                    "POST /banner": "multipart:v1.images.banner",
                    "POST /image": "multipart:v1.images.image",
                    "POST /icon": "multipart:v1.images.icon",
                }
            },
            {
                path: '/v1/user',
                mappingPolicy,
                bodyParsers,
                use,
                autoAliases: false,
                onAfterCall,
                aliases: {
                    /* users */
                    "POST /auth": "v1.users.signIn",
                    "PUT /auth": "v1.users.signUp",
                    "PATCH /auth": "v1.users.passwordRecovery",
                    /* config */
                    "GET /config": "v1.config.user",
                }
            },
            {
                path: '/v1/customer/upload',
                mappingPolicy,
                authentication: false,
                bodyParsers: {
                    json: false,
                    urlencoded: false,
                },
                busboyConfig: {
                    limits: {
                        files: 1
                    },
                },
                use: [
                    function (req, res, next) {
                        req.$ctx.meta.headers = req.headers;
                        next();
                    }
                ],
                autoAliases: false,
                aliases: {
                    "POST /avatar": "multipart:v1.images.avatar",
                }
            },
            {
                path: '/v1/customer',
                mappingPolicy,
                bodyParsers,
                use,
                autoAliases: false,
                onAfterCall,
                aliases: {
                    /* customers */
                    "POST /auth": "v1.customers.signIn",
                    "POST /otp": "v1.customers.otp",
                    "POST /check": "v1.customers.check",
                    "POST /profile": "v1.customers.profile",
                    "GET /code/:customerid": "v1.customers.code",
                    /* content */
                    "GET /showcase": "v1.showcase.data",
                    "GET /places": "v1.showcase.places",
                    "GET /sold-out/:placeid": "v1.sold-out.items",
                    /* agreements */
                    "GET /agreement/:agreementid": "v1.agreements.agreement",
                    /* promocode */
                    "POST /promocode": "v1.promocodes.promocode",
                    /* seasons */
                    "GET /seasons/:customerid": "v1.customer-seasons.items",
                    /* balances */
                    "GET /balances/:customerid": "v1.customer-balances.items",
                    /* bonuses */
                    "GET /bonuses/:customerid": "v1.customer-bonuses.items",
                    /* gift */
                    "GET /count/:customerid/:giftid": "v1.customer-gifts.count",
                    /* promotions */
                    "GET /promotions": "v1.promotions.promotions",
                    /* orders */
                    "GET /work-time/:placeid": "v1.places.workTime",
                    "GET /is-working/:placeid": "v1.places.isWorking",
                    "POST /order": "v1.orders.add",
                    "GET /orders/:customerid": "v1.orders.orders",
                    /* pay */
                    "POST /pay": "v1.payments.pay",
                    "GET /pay/success/:paymentid": "v1.payments.success",
                    "GET /pay/fail/:paymentid": "v1.payments.fail",
                    /* support */
                    "POST /support": "v1.support.send",
                }
            },
            {
                path: '/',
                mappingPolicy,
                bodyParsers,
                use,
                autoAliases: true,
                onAfterCall,
            }
        ],
        onError(req, res, err) {
            res.setHeader('Content-Type', 'text/plain');
            res.writeHead(err.code || 500);
            res.end(err.message);
        },
    },
    methods: {
        async authenticate(ctx, route, req/*, res*/) {
            const credentials = auth.parse(req.headers['authorization']);
            const userid = _.get(credentials, 'name');
            const token = _.get(credentials, 'pass');
            if (userid && token) {
                const user = await ctx.call('v1.users.check', {userid, token});
                if (_.size(user)) {
                    return Promise.resolve(user);
                } else {
                    this.unauthorized();
                }
            } else {
                this.unauthorized();
            }
        },
        unauthorized() {
            throw new MoleculerServerError('Unauthorized', 401);
        }
    }
};
