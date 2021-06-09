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
        items: {
            params: {
                lang: 'string',
            },
            async handler(ctx) {
                const lang = ctx.params.lang;
                const countries = [];
                const items = await ctx.call('v1.countries.find', {fields: '_id names'});
                _.each(items, (item) => {
                    countries.push({countryid: item._id, name: _.get(item, ['names', lang], item.names[lang])});
                });
                return _.sortBy(countries, ['name']);
            }
        }
    }
};