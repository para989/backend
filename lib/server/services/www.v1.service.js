const ApiService = require('moleculer-web');
const auth = require('basic-auth');
const _ = require('lodash');
const isHtml = require('is-html');
const mime = require('mime-types');
const fileExtension = require('file-extension');
const {isTest} = require('../helpers/test');
const {MoleculerServerError} = require('moleculer').Errors;

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
        /* cookies */
        req.$ctx.meta.cookies = req.cookies;
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
    settings: {
        server: false,
        optimizeOrder: false,
        routes: [
            {
                path: '/v1',
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
                    "POST /user/upload/photo": "multipart:v1.images.photo",
                    "POST /(user|customer)/upload/avatar": "multipart:v1.images.avatar",
                    "POST /user/upload/banner": "multipart:v1.images.banner",
                    "POST /(user|customer)/upload/image": "multipart:v1.images.image",
                    "POST /user/upload/icon": "multipart:v1.images.icon",
                    "POST /user/upload/svg": "multipart:v1.images.svg",
                }
            },
            {
                path: '/',
                mappingPolicy,
                bodyParsers,
                use,
                authentication: true,
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
    mixins: [ApiService],
    methods: {
        async authenticate(ctx, route, req/*, res*/) {
            const credentials = auth.parse(req.headers['authorization']);
            const id = _.get(credentials, 'name');
            const token = _.get(credentials, 'pass');
            if (id && token) {
                const user = await ctx.call('v1.users.check', {id, token});
                if (_.size(user)) {
                    return Promise.resolve(user);
                } else {
                    throw new MoleculerServerError('Unauthorized', 401);
                }
            }
        },
    }
};
