const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const UniquenessModel = require('../models/uniqueness.model');
const MongooseMixin = require('../mixins/mongoose.mixin');

module.exports = {
    name: 'uniqueness',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: UniquenessModel,
    actions: {
        get: {
            cache: false,
        },
        find: {
            cache: false,
        },
    }
};
