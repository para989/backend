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
                const docs = [];
                _.each(data, document => {
                    document.coordinates = {latitude: document.coordinates[1], longitude: document.coordinates[0]};
                    docs.push(document);
                });
                await this.adapter.model.insertMany(docs);
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
