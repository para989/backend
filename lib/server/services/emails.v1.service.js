const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const EmailModel = require('../models/email.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const AuthorizeMixin = require('../mixins/authorize.mixin');

module.exports = {
    name: 'emails',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: EmailModel,
    hooks: {
        before: {
            '*': 'hasAccess',
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
    }
};
