const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const CounterModel = require('../models/counter.model');
const MongooseMixin = require('../mixins/mongoose.mixin');

module.exports = {
    name: 'counters',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: CounterModel,
    actions: {
        get: {
            cache: false,
        },
        find: {
            cache: false,
        },
    },
};
