const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const CityModel = require('../models/city.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const fs = require('fs-extra');

module.exports = {
    name: 'cities',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: CityModel,
    async started() {
        const count = await this.adapter.model.countDocuments();
        if (count === 0) {
            const file = `${__dirname}/../assets/data/cities.json`;
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
        search: {
            params: {
                search: 'string',
            },
            async handler(ctx) {

                const search = ctx.params.search;
                const cities = [];

                const items = await this.adapter.model.find({$text: {$search: search}}, 'name coordinates')
                    .populate({path: 'country', select: 'name'})
                    .populate({path: 'region', select: 'name'})
                    .exec();

                _.each(items, item => {
                    cities.push({
                        name: `${item.country.name}, ${item.region.name}, ${item.name}`,
                        country: {
                            cityid: item.country._id,
                            name: item.country.name,
                        },
                        region: {
                            cityid: item.region._id,
                            name: item.region.name,
                        },
                        city: {
                            cityid: item._id,
                            name: item.name,
                        },
                        coordinates: item.coordinates,
                    });
                });

                return cities;

            }
        },
    }
};
