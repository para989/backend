const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const CountryModel = require('../models/country.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const fs = require('fs-extra');

module.exports = {
    name: 'countries',
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: CountryModel,
    async started() {
        const count = await this.adapter.model.countDocuments();
        if (count === 0) {
            const file = `${__dirname}/../assets/data/countries.json`;
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
        items: {
            async handler(ctx) {
                const countries = [];
                const items = await ctx.call('v1.countries.find', {fields: '_id name'});
                _.each(items, (item) => {
                    countries.push({countryid: item._id, name: item.name});
                });
                return _.sortBy(countries, ['name']);
            }
        }
    }
};
