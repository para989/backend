const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const RegionModel = require('../models/region.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const fs = require('fs-extra');
const AuthorizeMixin = require('../mixins/authorize.mixin');

module.exports = {
    name: 'regions',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: RegionModel,
    hooks: {
        before: {
            '*': 'hasAccess',
        }
    },
    async started() {
        const count = await this.adapter.model.countDocuments();
        if (count === 0) {
            const file = `${__dirname}/../assets/data/regions.json`;
            const data = fs.readJsonSync(file);
            if (_.size(data)) {
                const docs = [];
                _.each(data, document => {
                    docs.push(document);
                });
                await this.adapter.model.insertMany(docs);
            }
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
