const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const RegionModel = require('../models/region.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const fs = require('fs-extra');

module.exports = {
    name: 'regions',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: RegionModel,
    async started() {
        const count = await this.adapter.model.countDocuments();
        if (count === 0) {
            const file = `${__dirname}/../assets/data/regions.json`;
            const data = fs.readJsonSync(file);
            if (_.size(data)) {
                const ops = [];
                _.each(data, document => {
                    ops.push({insertOne: {document}});
                });
                await this.adapter.model.bulkWrite(ops);
            }
        }
    },
    actions: {
        get: {
            cache: false,
        },
        find: {
            cache: false,
        },
    }
};
