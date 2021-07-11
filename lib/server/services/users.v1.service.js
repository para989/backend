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

module.exports = {
    name: 'users',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: UserModel,
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
        // v1.users.get
        get: {
            cache: false,
        },
        // v1.users.find
        find: {
            cache: false,
        },
        // v1.users.check
        check: {
            cache: false,
            params: {
                userid: 'objectID',
            },
            async handler(ctx) {
                let result = {};
                await ctx.call('v1.users.get', {id: ctx.params.userid}).then(async user => {
                    if (_.get(user, 'token') === ctx.params.token) {
                        result = await this.userData(user);
                    }
                });
                return result;
            }
        },
        // v1.users.verifyUser
        verifyUser: {
            handler(ctx) {
                return ctx.meta.user;
            }
        },
        // v1.users.signIn
        signIn: {
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

                const user = await ctx.call('v1.users.findOne', {conditions: {email: email}});

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
            async handler(ctx) {
                return true;
            },
        },
        // v1.users.changePassword
        changePassword: {
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
            params: {
                email: {
                    type: 'email',
                    normalize: true,
                },
            },
            async handler(ctx) {

                const email = ctx.params.email;

                const user = await ctx.call('v1.users.findOne', {conditions: {email: email}});

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
                await this.broker.emit('password:created', data);

                return {ok: true};

            }

        },
        // v1.users.setProfile
        setProfile: {
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
        // v1.items.getUsers
        getUsers: {
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

                const _places = await ctx.call('v1.places.find');
                const places = {};
                _.each(_places, _place => {
                    const place = placeCard(_place);
                    places[_place._id.toString()] = place.address;
                    result.places.push(place);
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
                        userid: user._id,
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
        // v1.items.getUser
        getUser: {
            params: {
                userid: 'objectID',
            },
            async handler(ctx) {

                const userid = ctx.params.userid;

                const result = {
                    places: [],
                };

                const indexses = {};
                const places = await ctx.call('v1.places.find', {sort: 'order'});
                _.each(places, (place, i) => {
                    indexses[place._id.toString()] = i;
                    result.places.push({placeid: place._id, name: place.address, selected: false});
                });

                if (_.get(ctx.meta.user, 'permits.users') === 'write') {
                    const types = ['user-questionnaire', 'user-profile'];
                    const forms = await ctx.call('v1.forms.find', {query: {type: {$in: types}}});
                    _.each(forms, form => {
                        switch (form.type) {
                            case 'user-questionnaire':
                                result.questionnaire = {items: form.items};
                                break;
                            case 'user-profile':
                                result.profile = {items: form.items};
                                break;
                        }

                    });
                }

                if (userid === 'new') {
                    return result;
                }

                const user = await ctx.call('v1.users.findOne', {conditions: {_id: userid}});
                if (!user) {
                    throw new MoleculerServerError(ctx.meta.__('user-not-found'), 404);
                }

                result.userid = user._id;
                result.name = user.name;
                result.phone = user.phone;
                result.email = user.email;
                result.avatar = user.avatar;
                result.permits = user.permits;
                result.role = user.role;

                _.each(user.places, placeid => {
                    placeid = placeid.toString();
                    if (indexses[placeid] !== undefined) {
                        const index = indexses[placeid];
                        result.places[index].selected = true;
                    }
                });

                if (result.questionnaire) {
                    result.questionnaire.values = user.questionnaire;
                }

                if (result.profile) {
                    result.profile.values = user.profile;
                }

                result.reviews = await ctx.call('v1.reviews.items', {type: 'user', objectid: user._id});

                return result;

            }
        },
        // v1.items.addUser
        addUser: {
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

                const questionnaire = ctx.params.questionnaire;
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
                    if (_.size(questionnaire)) {
                        set.questionnaire = questionnaire;
                    }
                    if (_.size(profile)) {
                        set.profile = profile;
                    }
                }

                await ctx.call('v1.users.create', set).catch((err) => {
                    throw new MoleculerServerError(ctx.meta.__('user-exists'));
                });

            }
        },
        // v1.items.editUser
        editUser: {
            params: {
                userid: 'objectID',
            },
            async handler(ctx) {

                const userid = ctx.params.userid;
                const avatar = ctx.params.avatar;
                const name = _.trim(ctx.params.name);
                const email = _.trim(_.toLower(ctx.params.email));
                const phone = clearPhone(ctx.params.phone);
                const places = ctx.params.places;
                const role = ctx.params.role;
                const permits = ctx.params.permits;
                const questionnaire = ctx.params.questionnaire;
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
                    if (_.size(questionnaire)) {
                        set.questionnaire = questionnaire;
                    } else {
                        unset.questionnaire = '';
                    }
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

                await ctx.call('v1.users.updateOne', {filter: {_id: userid}, doc});

            }
        },
        // v1.items.deleteUser
        deleteUser: {
            params: {
                userid: 'objectID',
            },
            async handler(ctx) {

                const userid = ctx.params.userid;

                const user = await ctx.call('v1.users.findOne', {conditions: {_id: userid}});
                if (!user) {
                    throw new MoleculerServerError(ctx.meta.__('user-not-found'), 404);
                }


                await ctx.call('v1.users.deleteOne', {conditions: {_id: userid}});

            }
        },
        // v1.items.getQuestionnaire
        getQuestionnaire: {
            params: {
                userid: 'objectID',
            },
            async handler(ctx) {

                const userid = ctx.params.userid;

                const user = await ctx.call('v1.users.findOne', {conditions: {_id: userid}});
                if (!user) {
                    throw new MoleculerServerError(ctx.meta.__('user-not-found'), 404);
                }

                const form = await ctx.call('v1.forms.findOne', {conditions: {type: 'user-questionnaire'}});
                if (!form) {
                    throw new MoleculerServerError(ctx.meta.__('form-not-found'), 404);
                }

                return {items: form.items, values: user.questionnaire};

            },
        },
        // v1.items.setQuestionnaire
        setQuestionnaire: {
            async handler(ctx) {

                const userid = ctx.params.userid;
                const questionnaire = ctx.params.questionnaire;

                const set = {};
                const unset = {};

                if (_.size(questionnaire)) {
                    set.questionnaire = questionnaire;
                } else {
                    unset.questionnaire = '';
                }

                const doc = {$set: set};
                if (_.size(unset)) {
                    doc.$unset = unset;
                }

                await ctx.call('v1.users.updateOne', {filter: {_id: userid}, doc});

            },
        },
    },
    methods: {
        async userData(data, token) {

            const role = data.role;

            const defaultPermit = role === 'admin' ? 'write' : 'read';

            const permits = _.get(data, 'permits', {});
            if (_.isUndefined(permits.orders)) {
                permits.orders = defaultPermit;
            }
            if (_.isUndefined(permits.places)) {
                permits.places = defaultPermit;
            }
            if (_.isUndefined(permits.showcase)) {
                permits.showcase = defaultPermit;
            }
            if (_.isUndefined(permits.marketing)) {
                permits.marketing = defaultPermit;
            }
            if (_.isUndefined(permits.users)) {
                permits.users = defaultPermit;
            }
            if (_.isUndefined(permits.reports)) {
                permits.reports = defaultPermit;
            }
            if (_.isUndefined(permits.settings)) {
                permits.settings = defaultPermit;
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
