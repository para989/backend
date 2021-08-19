const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const UserModel = require('../models/user.model');
const {MoleculerServerError} = require('moleculer').Errors;
const MongooseMixin = require('../mixins/mongoose.mixin');
const passwordGenerator = require('password-generator');
const {clearPhone} = require('../helpers/phone');
const {placeCard} = require('../helpers/place');
const {sha256} = require('../helpers/crypto');
const {generateToken} = require('../helpers/token');
const AuthorizeMixin = require('../mixins/authorize.mixin');
const {isTest} = require('../helpers/test');
const cache = !isTest();

module.exports = {
    name: 'users',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: UserModel,
    hooks: {
        before: {
            '*': 'hasAccess',
        }
    },
    settings: {
        rest: '/v1',
    },
    async started() {
        const count = await this.adapter.model.countDocuments();
        if (count === 0) {
            const name = 'Admin';
            const email = 'admin@example.com';
            const role = 'admin';
            const password = sha256('admin');
            const token = await generateToken();
            await this.adapter.model.create({name, email, role, password, token});
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
        // v1.users.check
        check: {
            cache,
            params: {
                id: 'objectID',
                token: 'string',
            },
            async handler(ctx) {
                const user = await this.adapter.model.findOne({_id: ctx.params.id});
                if (_.get(user, 'token') === ctx.params.token) {
                    return await this.userData(user);
                }
                return undefined;
            }
        },
        // v1.users.verifyUser
        verifyUser: {
            rest: 'GET /user/auth',
            handler(ctx) {
                return ctx.meta.user;
            }
        },
        // v1.users.signIn
        signIn: {
            rest: 'POST /user/auth',
            params: {
                email: {
                    type: 'email',
                    normalize: true,
                },
                password: {
                    type: 'string',
                },
            },
            async handler(ctx) {

                const email = ctx.params.email;

                const user = await ctx.call('v1.users.findOne', {query: {email: email}});

                if (_.isEmpty(user)) {
                    throw new MoleculerServerError(ctx.meta.__('user-not-found'), 404);
                }

                let token = user.token;

                if (_.get(user, 'wrong.date')) {
                    let curTime = new Date().getTime() / 1000;
                    let wrongTime = _.get(user, 'wrong.date').getTime() / 1000;
                    let difference = curTime - wrongTime;
                    let count = _.get(user, 'wrong.count', 1);
                    if (difference <= 300 && count >= 5) {
                        throw new MoleculerServerError(ctx.meta.__('login-block'), 429);
                    }
                }

                const password = sha256(ctx.params.password);

                if (password !== user.password && _.includes(user.passwords, password) !== true) {
                    const doc = {};
                    doc['$set'] = {'wrong.date': new Date()};
                    doc['$inc'] = {'wrong.count': 1};
                    await ctx.call('v1.users.updateOne', {filter: {_id: user._id}, doc});
                    throw new MoleculerServerError(ctx.meta.__('incorrect-password'), 403);
                }

                const set = {'visited': new Date()};
                const unset = {'wrong': '', 'passwords': ''};
                if (_.includes(user.passwords, password)) {
                    set['password'] = password;
                    token = await generateToken();
                    set['token'] = token;
                }

                await ctx.call('v1.users.updateOne', {filter: {_id: user._id}, doc: {$set: set, $unset: unset}});

                return await this.userData(user, token);

            }
        },
        // v1.users.signUp
        signUp: {
            rest: 'PUT /user/auth',
            params: {
                name: {
                    type: 'string',
                },
                email: {
                    type: 'email',
                    normalize: true,
                },
                phone: {
                    type: 'string',
                    optional: true,
                },
                password: {
                    type: 'string',
                },
            },
            async handler(ctx) {

                const name = _.trim(ctx.params.name);
                const email = ctx.params.email;
                const phone = clearPhone(ctx.params.phone);
                const password = sha256(ctx.params.password);
                const token = await generateToken();

                const user = {
                    name,
                    email,
                    password,
                    token,
                };

                if (phone) {
                    user.phone = phone;
                }

                await ctx.call('v1.users.create', user).catch(() => {
                    throw new MoleculerServerError(ctx.meta.__('user-exists'));
                });

                return true;

            },
        },
        // v1.users.signOut
        signOut: {
            rest: 'DELETE /user/auth',
            async handler(ctx) {
                return true;
            },
        },
        // v1.users.changePassword
        changePassword: {
            rest: 'PATCH /user/password',
            params: {
                current: {
                    type: 'string',
                },
                renewed: {
                    type: 'string',
                },
            },
            async handler(ctx) {

                const cryptoCurrent = sha256(ctx.params.current);
                const cryptoRenewed = sha256(ctx.params.renewed);

                const user = await ctx.call('v1.users.get', {id: ctx.meta.user.id});

                if (cryptoCurrent !== user.password) {
                    throw new MoleculerServerError(ctx.meta.__('current-password-is-different'));
                }

                if (cryptoRenewed === user.password) {
                    throw new MoleculerServerError(ctx.meta.__('current-password-is-the-same'));
                }

                const token = await generateToken();

                await ctx.call('v1.users.updateOne', {
                    filter: {_id: user._id},
                    doc: {password: cryptoRenewed, token: token}
                });

                return await this.userData(user, token);

            },
        },
        // v1.users.passwordRecovery
        passwordRecovery: {
            rest: 'PATCH /user/auth',
            params: {
                email: {
                    type: 'email',
                    normalize: true,
                },
            },
            async handler(ctx) {

                const email = ctx.params.email;

                const user = await ctx.call('v1.users.findOne', {query: {email: email}});

                if (_.isEmpty(user)) {
                    throw new MoleculerServerError(ctx.meta.__('user-not-found'), 404);
                }

                if (_.size(user.passwords) > 9) {
                    throw new MoleculerServerError(ctx.meta.__('too-many-passwords'));
                }

                const regularPassword = passwordGenerator(8, true);
                const cryptoPassword = sha256(regularPassword);

                await ctx.call('v1.users.updateOne', {
                    filter: {_id: user._id},
                    doc: {$addToSet: {passwords: cryptoPassword}}
                });

                const data = {name: user.name, email: user.email, password: regularPassword};
                await this.broker.emit('password:created', {data});

                return {ok: true};

            }

        },
        // v1.users.setProfile
        setProfile: {
            rest: 'PATCH /user/profile',
            params: {
                name: {
                    type: 'string',
                },
                email: {
                    type: 'email',
                    normalize: true,
                },
                phone: {
                    type: 'string',
                    optional: true,
                },
                avatar: {
                    type: 'string',
                    optional: true,
                },
            },
            async handler(ctx) {

                const user = _.cloneDeep(ctx.meta.user);
                user.name = _.trim(ctx.params.name);
                user.email = ctx.params.email;
                user.phone = clearPhone(ctx.params.phone);
                user.avatar = ctx.params.avatar;

                const set = {name: user.name, email: user.email, avatar: user.avatar};
                const unset = {};
                if (user.phone) {
                    set.phone = user.phone;
                } else {
                    unset.phone = user.phone;
                }
                const doc = {$set: set};
                if (_.size(unset)) {
                    doc.$unset = unset;
                }

                await ctx.call('v1.users.updateOne', {filter: {_id: user.id}, doc}).catch((err) => {
                    throw new MoleculerServerError(ctx.meta.__('user-exists'));
                });

                return await this.userData(user);

            }
        },
        // v1.users.getUsers
        getUsers: {
            role: 'users:read',
            rest: 'GET /user/users',
            params: {
                page: {
                    type: 'number',
                    positive: true,
                    convert: true,
                    default: 1,
                },
            },
            async handler(ctx) {

                const search = ctx.params.search;
                const page = ctx.params.page;

                const result = {
                    places: [],
                    items: [],
                };

                const places = await ctx.call('v1.places.find');
                _.each(places, place => {
                    result.places.push(placeCard(place));
                });

                const where = {};

                if (_.size(ctx.params.placeids)) {
                    where.places = {$in: ctx.params.placeids};
                } else if (_.size(ctx.meta.user.places)) {
                    where.places = {$in: ctx.meta.user.places};
                }

                const users = await ctx.call('v1.users.find', {
                    query: where,
                    search, searchFields: 'name email phone', limit: 100,
                    sort: '-date',
                    offset: page > 1 ? ((page - 1) * 100) : 0,
                });
                _.each(users, user => {
                    result.items.push({
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        avatar: user.avatar,
                        role: user.role,
                    });
                });

                return result;

            }
        },
        // v1.users.getUser
        getUser: {
            role: 'users:read',
            rest: 'GET /user/user/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const result = {};

                result.places = await ctx.call('v1.places.selector');

                if (_.get(ctx.meta.user, 'permits.users') === 'write') {
                    const types = ['user-profile'];
                    const forms = await ctx.call('v1.forms.find', {query: {type: {$in: types}}});
                    _.each(forms, form => {
                        switch (form.type) {
                            case 'user-profile':
                                result.profile = form.items;
                                break;
                        }

                    });
                }

                if (id === 'new') {
                    return result;
                }

                const user = await this.adapter.model.findOne({_id: id});
                if (!user) {
                    throw new MoleculerServerError(ctx.meta.__('user-not-found'), 404);
                }

                result.user = user.toJSON();
                result.user.password = '';

                result.reviews = await ctx.call('v1.reviews.items', {type: 'user', objectid: user._id});

                return result;

            }
        },
        // v1.users.addUser
        addUser: {
            role: 'users:write',
            rest: 'POST /user/user',
            async handler(ctx) {

                const avatar = ctx.params.avatar;
                const name = _.trim(ctx.params.name);
                const email = _.trim(_.toLower(ctx.params.email));
                const phone = clearPhone(ctx.params.phone);

                const password = sha256(ctx.params.password);
                const token = await generateToken();
                const places = ctx.params.places;
                const role = ctx.params.role;
                const permits = ctx.params.permits;

                const profile = ctx.params.profile;

                const set = {};
                set.name = name;
                set.email = email;
                set.password = password;
                set.token = token;
                set.role = role;
                if (phone) {
                    set.phone = phone;
                }
                if (avatar) {
                    set.avatar = avatar;
                }
                if (_.size(places)) {
                    set.places = places;
                }
                if (_.size(permits)) {
                    set.permits = permits;
                }

                if (_.get(ctx.meta.user, 'permits.users') === 'write') {
                    if (_.size(profile)) {
                        set.profile = profile;
                    }
                }

                await ctx.call('v1.users.create', set).catch((err) => {
                    throw new MoleculerServerError(ctx.meta.__('user-exists'));
                });

            }
        },
        // v1.users.editUser
        editUser: {
            role: 'users:write',
            rest: 'PATCH /user/user',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;
                const avatar = ctx.params.avatar;
                const name = _.trim(ctx.params.name);
                const email = _.trim(_.toLower(ctx.params.email));
                const phone = clearPhone(ctx.params.phone);
                const places = ctx.params.places;
                const role = ctx.params.role;
                const permits = ctx.params.permits;
                const profile = ctx.params.profile;

                const set = {};
                const unset = {};
                set.name = name;
                set.email = email;
                set.role = role;
                if (phone) {
                    set.phone = phone;
                } else {
                    unset.phone = '';
                }
                if (avatar) {
                    set.avatar = avatar;
                } else {
                    unset.avatar = '';
                }
                if (ctx.params.password) {
                    const password = sha256(ctx.params.password);
                    const token = await generateToken();
                    set.password = password;
                    set.token = token;
                }
                if (_.size(places)) {
                    set.places = places;
                } else {
                    unset.places = '';
                }
                if (_.size(permits)) {
                    set.permits = permits;
                } else {
                    unset.permits = '';
                }

                if (_.get(ctx.meta.user, 'permits.users') === 'write') {
                    if (_.size(profile)) {
                        set.profile = profile;
                    } else {
                        unset.profile = '';
                    }
                }

                const doc = {$set: set};
                if (_.size(unset)) {
                    doc.$unset = unset;
                }

                await ctx.call('v1.users.updateOne', {filter: {_id: id}, doc});

                await this.broker.cacher.clean('v1.users.**');

            }
        },
        // v1.users.deleteUser
        deleteUser: {
            role: 'users:write',
            rest: 'DELETE /user/user/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const user = await ctx.call('v1.users.findOne', {query: {_id: id}});
                if (!user) {
                    throw new MoleculerServerError(ctx.meta.__('user-not-found'), 404);
                }

                await ctx.call('v1.users.deleteOne', {query: {_id: id}});

                await this.broker.cacher.clean('v1.users.**');

            }
        },
    },
    methods: {
        async userData(data, token) {

            const role = data.role;
            const permits = _.get(data, 'permits', {});

            const items = ['orders', 'places', 'checklists', 'showcase', 'marketing', 'users', 'reports', 'settings', 'reviews'];
            _.each(items, item => {
                if (_.isUndefined(permits[item])) {
                    permits[item] = role === 'admin' ? 'write' : 'read';
                }
            });

            permits['cities'] = 'read';
            permits['images'] = 'write';
            permits['brands'] = permits['places'];
            permits['forms'] = permits['users'];
            permits['reviews'] = permits['marketing'];
            permits['support'] = permits['marketing'];

            if (role === 'operator') {
                permits['orders'] = 'write';
            }

            const result = {
                id: data._id || data.id,
                name: data.name,
                email: data.email,
                phone: data.phone,
                avatar: data.avatar,
                token: token || data.token,
                role,
                permits,
                places: data.places,
            };

            if (_.size(data.places)) {
                result.places = data.places;
                const placeid = data.places[0];
                const place = await this.broker.call('v1.places.get', {id: placeid.toString()});
                if (place) {
                    result.address = placeCard(place).address;
                }
            }

            return result;
        },
    }
};
