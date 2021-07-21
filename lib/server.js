const _ = require('lodash');
const mongoose = require('mongoose');
const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs-extra');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const useragent = require('express-useragent');
const requestIp = require('request-ip');
const requestLanguage = require('express-request-language');
const socket = require('socket.io');
const redisAdapter = require('socket.io-redis');
const Redis = require('ioredis');
const express = require('express');

exports.start = async () => {

    const app = express();

    app.use(compression());
    app.use(cors());

    /* Office */
    app.use('/office', express.static(path.join(__dirname, 'office'), {index: ['index.html']}));

    /* Static files */
    app.use('/', express.static(path.join(__dirname, 'static')));
    app.use('/sourcemaps/tiny-slider.js.map', express.static(path.join(__dirname, 'static/js/tiny-slider.js.map')));

    app.use(requestIp.mw());
    // app.use(helmet({frameguard: false}));
    app.use(useragent.express());
    app.use(requestLanguage({
        languages: [global.LANG]
    }));

    const i18n = require('i18n');
    const {isTest} = require('./server/helpers/test');
    i18n.configure({
        locales: [global.LANG],
        defaultLocale: global.LANG,
        queryParameter: 'lang',
        directory: `${__dirname}/server/locales`,
        autoReload: isTest(),
        updateFiles: false,
        syncFiles: false,
    });
    app.use(i18n.init);

    const {ServiceBroker} = require('moleculer');
    const brokerOptions = {
        hotReload: isTest(),
        metadata: {
            i18n
        }
    };
    brokerOptions.transporter = {
        type: 'Redis',
        options: global.REDIS,
    };
    brokerOptions.cacher = {
        type: 'Redis',
        options: {
            prefix: 'app',
            ttl: isTest() ? 600 : 86400,
            monitor: true,
            redis: global.REDIS,
        }
    };
    brokerOptions.validator = {
        type: 'Fastest',
        options: {
            defaults: {
                objectID: {
                    ObjectID: {
                        isValid(value) {
                            return mongoose.Types.ObjectId.isValid(value) || value === 'new';
                        },
                    },
                }
            },
        },
    }
    const broker = new ServiceBroker(brokerOptions);
    broker.loadServices(path.join(__dirname, `./server/services`));
    if (global.SEVICES && fs.existsSync(global.SEVICES)) {
        broker.loadServices(global.SEVICES);
    }

    const wwwService = broker.getLocalService({name: 'www', version: 1});
    app.use('/', wwwService.express());

    const createSocket = (io) => {
        io.adapter(redisAdapter({
            pubClient: new Redis(global.REDIS),
            subClient: new Redis(global.REDIS),
        }));
        broker.createService({
            name: 'io',
            version: 1,
            dependencies: [
                'v1.users',
                'v1.places',
            ],
            started() {
                io.on('connection', this.connection);
            },
            actions: {
                // v1.io.emit
                emit: {
                    params: {
                        event: 'string',
                        data: 'object',
                        room: {
                            type: 'string',
                            optional: true,
                        },
                    },
                    async handler(ctx) {
                        const event = ctx.params.event;
                        const data = JSON.parse(JSON.stringify(ctx.params.data));
                        const room = ctx.params.room;
                        if (room) {
                            io.to(room).emit(event, data);
                        } else {
                            io.emit(event, data);
                        }
                    },
                }
            },
            methods: {
                connection(socket) {
                    socket.on('join', async data => {
                        await this.join(socket, data);
                    });
                    socket.on('leave', async data => {
                        await this.leave(socket, data);
                    });
                },
                async join(socket, data) {
                    console.log('join', data);
                    if (socket.rooms) {
                        socket.rooms.forEach(room => {
                            if (new RegExp("^[0-9a-fA-F]{24}$").test(room)) {
                                socket.leave(room);
                            }
                        });
                    }
                    if (data.userid && data.token) {
                        const user = await this.broker.call('v1.users.check', {id: data.userid, token: data.token});
                        if (user) {
                            socket.join(`user-${data.userid}`);
                            if (_.size(user.places)) {
                                _.each(user.places, placeid => {
                                    socket.join(`place-${placeid}`);
                                });
                            } else {
                                const places = await this.broker.call('v1.places.find', {fields: '_id'});
                                _.each(places, place => {
                                    socket.join(`place-${place._id}`);
                                });
                            }
                        }
                    }
                    if (data.customerid) {
                        socket.join(`customer-${data.customerid}`);
                        if (data.placeid) {
                            socket.join(`place-${data.placeid}`);
                        }
                    }
                },
                async leave(socket) {
                    console.log('leave');
                    if (socket.rooms) {
                        socket.rooms.forEach(room => {
                            if (new RegExp("^[0-9a-fA-F]{24}$").test(room)) {
                                socket.leave(room);
                            }
                        });
                    }
                },
            },
        });
    }

    if (isTest()) {
        const httpServer = http.createServer(app);
        httpServer.listen(4000);
        createSocket(socket(httpServer));
        const options = {
            key: fs.readFileSync(path.join(__dirname, 'key.pem')),
            cert: fs.readFileSync(path.join(__dirname, 'cert.pem')),
        };
        const httpsServer = https.createServer(options, app);
        httpsServer.listen(4043);
        createSocket(socket(httpsServer)); // chrome://flags/#allow-insecure-localhost
    } else {
        const configDir = path.join(__dirname, 'server', 'greenlock.d');
        const configFile = path.join(configDir, 'config.json');
        const configJSON = fs.readJsonSync(configFile);
        if (_.get(configJSON, 'defaults.challenges')) {
            delete configJSON.defaults.challenges;
        }
        if (_.get(configJSON, 'defaults.store')) {
            delete configJSON.defaults.store;
        }
        fs.writeJsonSync(configFile, configJSON, {spaces: '\t'});
        const options = {
            packageRoot: path.join(__dirname, '..'),
            configDir,
            manager: path.join(configDir, 'manager.js'),
            maintainerEmail: 'mail@multiflash.name',
            cluster: false,
            debug: false,
            challenges: {
                'http-01': {
                    module: path.join(configDir, 'challenge.js'),
                }
            },
            store: {
                module: path.join(configDir, 'store.js'),
            },
            notify: (ev, args) => {
                // console.log(ev, args);
            },
        };
        require('greenlock-express').init(options).ready(glx => {
            createSocket(socket(glx.httpsServer()));
        }).serve(app);
    }

    await broker.start();

    await broker.cacher.clean();

};
