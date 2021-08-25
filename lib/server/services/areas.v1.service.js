const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const AreaModel = require('../models/area.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;
const AuthorizeMixin = require('../mixins/authorize.mixin');
const {DOMParser} = require('xmldom');
const togeojson = require('@mapbox/togeojson');

module.exports = {
    name: 'areas',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: AreaModel,
    hooks: {
        before: {
            '*': 'hasAccess',
        }
    },
    settings: {
        rest: '/v1',
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
            role: 'places:read',
            rest: 'GET /user/areas/:placeid',
            async handler(ctx) {

                const placeid = ctx.params.placeid;

                return await this.adapter.model.find({place: placeid}, 'id name description active').sort('order').exec();

            }
        },
        item: {
            role: 'places:read',
            rest: 'GET /user/area/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const area = await this.adapter.model.findOne({_id: id});
                if (!area) {
                    throw new MoleculerServerError(ctx.meta.__('area-not-found'), 404);
                }

                return area.toJSON();

            }
        },
        add: {
            role: 'places:write',
            rest: 'POST /user/area',
            params: {
                placeid: 'objectID',
                type: {
                    type: 'string',
                    enum: ['kml', 'geojson'],
                },
                content: 'string',
            },
            async handler(ctx) {

                const placeid = ctx.params.placeid;
                const type = ctx.params.type;
                const content = ctx.params.content;

                let json;

                if (type === 'kml') {
                    let kml = new DOMParser().parseFromString(content);
                    json = togeojson.kml(kml);
                } else if (type === 'geojson') {
                    json = JSON.parse(content);
                }

                if (_.isEmpty(_.get(json, 'features'))) {
                    throw new MoleculerServerError(ctx.meta.__('area-not-found'), 404);
                }

                const docs = [];

                _.each(json.features, feature => {
                    if (feature.geometry.type === 'LineString' || feature.geometry.type === 'Polygon') {
                        const name = _.get(feature, 'properties.name', ctx.meta.__('untitled'));
                        const description = _.get(feature, 'properties.description');
                        const doc = {place: placeid, name, description, coordinates: []};
                        if (description) {
                            doc.description = description;
                        }
                        let coordinates;
                        switch (feature.geometry.type) {
                            case 'LineString':
                                coordinates = feature.geometry.coordinates;
                                break;
                            case 'Polygon':
                                coordinates = feature.geometry.coordinates[0];
                                break;
                        }
                        _.each(coordinates, point => {
                            doc.coordinates.push({latitude: point[1], longitude: point[0]});
                        });
                        if (_.size(coordinates) > 3) {
                            docs.push(doc);
                        }
                    }
                });

                if (_.size(docs)) {
                    await this.adapter.model.insertMany(docs);
                } else {
                    throw new MoleculerServerError(ctx.meta.__('area-not-found'), 404);
                }

                await this.broker.broadcast('content:updated');

            }
        },
        edit: {
            role: 'places:write',
            rest: 'PATCH /user/area',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;
                const active = ctx.params.active;
                const gallery = ctx.params.gallery;
                const name = _.trim(ctx.params.name);
                const description = ctx.params.description;
                const waitingTime = ctx.params.waitingTime;
                const costDelivery = ctx.params.costDelivery;
                const freeDelivery = ctx.params.freeDelivery;
                const minimumAmount = ctx.params.minimumAmount;

                const set = {};
                const unset = {};
                set.active = active;
                set.gallery = gallery;
                set.name = name;
                set.waitingTime = waitingTime;
                set.costDelivery = costDelivery;
                set.freeDelivery = freeDelivery;
                set.minimumAmount = minimumAmount;
                if (description) {
                    set.description = description;
                } else {
                    unset.description = '';
                }

                const doc = {$set: set};
                if (_.size(unset)) {
                    doc.$unset = unset;
                }

                await this.adapter.model.updateOne({_id: id}, doc);

                await this.broker.broadcast('content:updated');

            }
        },
        delete: {
            role: 'places:write',
            rest: 'DELETE /user/area/:id',
            params: {
                id: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.id;

                const area = await this.adapter.model.findOne({_id: id});
                if (!area) {
                    throw new MoleculerServerError(ctx.meta.__('area-not-found'), 404);
                }

                await this.adapter.model.deleteOne({_id: id});

                await this.broker.broadcast('content:updated');

            }
        },
    }
};
