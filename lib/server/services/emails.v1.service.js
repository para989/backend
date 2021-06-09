const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const EmailModel = require('../models/email.model');
const MongooseMixin = require('../mixins/mongoose.mixin');

module.exports = {
    name: 'emails',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: EmailModel,
    actions: {
        get: {
            cache: false,
        },
        find: {
            cache: false,
        },
    }
};
