const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const PlaceModel = require('../models/place.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {MoleculerServerError} = require('moleculer').Errors;
const moment = require('moment-timezone');
const {removeQuestion} = require('../helpers/remove-question');
const {isTest} = require('../helpers/test');
const AuthorizeMixin = require('../mixins/authorize.mixin');
const {placeCard} = require("../helpers/place");

module.exports = {
    name: 'places',
    version: 1,
    mixins: [DbService, MongooseMixin, AuthorizeMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: PlaceModel,
    hooks: {
        before: {
            '*': 'hasAccess',
        }
    },
    settings: {
        rest: '/v1',
    },
    async started() {
        const count = await this.adapter.model.countDocuments();
        if (count === 0) {
            await this.broker.waitForServices(['v1.cities']);
            const city = await this.broker.call('v1.cities.findOne', {conditions: {name: 'New York'}});
            if (city) {
                await this.adapter.model.create({
                    active: true,
                    primary: true,
                    name: `729 Knickerbocker Ave ${city.name}`,
                    city: city._id,
                    address: '729 Knickerbocker Ave',
                    coordinates: city.coordinates,
                    phone: '+1 (718) 418-00-00',
                    email: `mail@${global.DOMAIN}`,
                    delivery: true,
                    pickup: true,
                    inside: true,
                });
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
            role: 'places:read',
            rest: 'GET /user/places',
            cache: false,
            async handler(ctx) {

                const search = ctx.params.search;
                const result = [];

                const places = await ctx.call('v1.places.find', {
                    search,
                    searchFields: 'name phone description',
                    sort: 'order'
                });

                _.each(places, place => {
                    result.push({
                        placeid: place._id,
                        name: place.name,
                        address: place.address,
                        picture: _.get(place, 'gallery.0.picture'),
                        phone: place.phone,
                        description: place.description,
                        active: place.active,
                        primary: place.primary,
                        test: place.test,
                        delivery: place.delivery,
                        pickup: place.pickup,
                        inside: place.inside,
                        coordinates: place.coordinates,
                    });
                });

                return result;

            },
        },
        item: {
            role: 'places:read',
            rest: 'GET /user/place/:placeid',
            cache: false,
            params: {
                placeid: 'objectID',
            },
            async handler(ctx) {

                const placeid = ctx.params.placeid;

                const result = {};

                if (placeid === 'new') {
                    return result;
                }

                const place = await ctx.call('v1.places.findOne', {conditions: {_id: placeid}});
                if (!place) {
                    throw new MoleculerServerError(ctx.meta.__('place-not-found'), 404);
                }

                const city = await ctx.call('v1.cities.findOne', {conditions: {_id: place.city}});
                if (!city) {
                    throw new MoleculerServerError(ctx.meta.__('city-not-found'), 404);
                }

                const region = await ctx.call('v1.regions.findOne', {conditions: {_id: city.region}});
                if (!region) {
                    throw new MoleculerServerError(ctx.meta.__('region-not-found'), 404);
                }

                const country = await ctx.call('v1.countries.findOne', {conditions: {_id: city.country}});
                if (!country) {
                    throw new MoleculerServerError(ctx.meta.__('country-not-found'), 404);
                }

                result.placeid = place._id.toString();
                result.gallery = place.gallery;
                result.description = place.description;
                result.active = place.active;
                result.primary = place.primary;
                result.test = place.test;

                result.delivery = place.delivery;
                result.pickup = place.pickup;
                result.inside = place.inside;

                result.country = {
                    countryid: country._id,
                    name: country.name,
                };
                result.region = {
                    regionid: region._id,
                    name: region.name,
                };
                result.city = {
                    cityid: city._id,
                    name: city.name,
                };

                result.address = place.address;
                result.coordinates = place.coordinates;

                result.email = place.email;
                result.phone = place.phone;
                result.schedule = place.schedule;

                return result;

            }
        },
        add: {
            role: 'places:write',
            rest: 'POST /user/place',
            cache: false,
            async handler(ctx) {

                const active = ctx.params.active === true;
                const primary = ctx.params.primary === true;
                const test = ctx.params.test === true;
                const delivery = ctx.params.delivery === true;
                const pickup = ctx.params.pickup === true;
                const inside = ctx.params.inside === true;
                const cityid = ctx.params.cityid;
                const address = ctx.params.address;
                const coordinates = ctx.params.coordinates;
                const description = _.trim(ctx.params.description);
                const email = _.toLower(_.trim(ctx.params.email));
                const phone = _.trim(ctx.params.phone);
                const schedule = ctx.params.schedule;

                const city = await ctx.call('v1.cities.findOne', {conditions: {_id: cityid}});
                if (!city) {
                    throw new MoleculerServerError(ctx.meta.__('city-not-found'), 404);
                }

                const gallery = ctx.params.gallery;
                const time = Math.ceil(new Date().getTime() / 1000);
                _.each(gallery, (item) => {
                    item.picture = removeQuestion(item.picture);
                    item.picture += '?' + time;
                });

                const set = {};
                set.active = active;
                set.primary = primary;
                set.delivery = delivery;
                set.pickup = pickup;
                set.inside = inside;
                set.name = `${city.name}, ${address}`;
                set.city = cityid;
                set.address = address;
                set.coordinates = coordinates;
                if (test) {
                    set.test = test;
                }
                if (_.size(gallery)) {
                    set.gallery = gallery;
                }
                if (description) {
                    set.description = description;
                }
                if (email) {
                    set.email = email;
                }
                if (phone) {
                    set.phone = phone;
                }
                if (schedule) {
                    set.schedule = schedule;
                }

                if (primary) {
                    await ctx.call('v1.places.updateMany', {filter: {}, doc: {primary: false}});
                }

                await ctx.call('v1.places.create', set);

                await this.broker.broadcast('content:updated');

            }
        },
        edit: {
            role: 'places:write',
            rest: 'PATCH /user/place',
            cache: false,
            params: {
                placeid: 'objectID',
            },
            async handler(ctx) {

                const placeid = ctx.params.placeid;
                const active = ctx.params.active === true;
                const primary = ctx.params.primary === true;
                const test = ctx.params.test === true;
                const delivery = ctx.params.delivery === true;
                const pickup = ctx.params.pickup === true;
                const inside = ctx.params.inside === true;
                const cityid = ctx.params.cityid;
                const address = ctx.params.address;
                const coordinates = ctx.params.coordinates;
                const description = _.trim(ctx.params.description);
                const email = _.toLower(_.trim(ctx.params.email));
                const phone = _.trim(ctx.params.phone);
                const schedule = ctx.params.schedule;

                const city = await ctx.call('v1.cities.findOne', {conditions: {_id: cityid}});
                if (!city) {
                    throw new MoleculerServerError(ctx.meta.__('city-not-found'), 404);
                }

                const gallery = ctx.params.gallery;
                const time = Math.ceil(new Date().getTime() / 1000);
                _.each(gallery, (item) => {
                    item.picture = removeQuestion(item.picture);
                    item.picture += '?' + time;
                });

                const set = {};
                const unset = {};
                set.active = active;
                set.primary = primary;
                set.delivery = delivery;
                set.pickup = pickup;
                set.inside = inside;
                set.name = `${city.name}, ${address}`;
                set.city = cityid;
                set.address = address;
                set.coordinates = coordinates;
                if (test) {
                    set.test = test;
                } else {
                    unset.test = '';
                }
                if (_.size(gallery)) {
                    set.gallery = gallery;
                } else {
                    unset.gallery = '';
                }
                if (description) {
                    set.description = description;
                } else {
                    unset.description = '';
                }
                if (email) {
                    set.email = email;
                } else {
                    unset.email = '';
                }
                if (phone) {
                    set.phone = phone;
                } else {
                    unset.phone = '';
                }
                if (schedule) {
                    set.schedule = schedule;
                } else {
                    unset.schedule = '';
                }

                const doc = {$set: set};
                if (_.size(unset)) {
                    doc.$unset = unset;
                }

                if (primary) {
                    await ctx.call('v1.places.updateMany', {filter: {}, doc: {primary: false}});
                }

                await ctx.call('v1.places.updateOne', {filter: {_id: placeid}, doc});

                await this.broker.broadcast('content:updated');

            }
        },
        delete: {
            role: 'places:write',
            rest: 'DELETE /user/place/:placeid',
            cache: false,
            params: {
                placeid: 'objectID',
            },
            async handler(ctx) {

                const count = await this.adapter.model.countDocuments();
                if (count < 2) {
                    throw new MoleculerServerError(ctx.meta.__('single-place'));
                }

                const placeid = ctx.params.placeid;
                const place = await ctx.call('v1.places.findOne', {conditions: {_id: placeid}});
                if (!place) {
                    throw new MoleculerServerError(ctx.meta.__('place-not-found'), 404);
                }

                await ctx.call('v1.places.deleteOne', {conditions: {_id: placeid}});

                await this.broker.broadcast('content:updated');

            }
        },
        isWorking: {
            rest: 'GET /customer/is-working/:placeid',
            cache: false,
            params: {
                placeid: 'objectID',
            },
            async handler(ctx) {

                const placeid = ctx.params.placeid;

                const place = await ctx.call('v1.places.get', {id: placeid, fields: 'schedule city'});
                if (!place) {
                    throw new MoleculerServerError(ctx.meta.__('place-not-found'), 404);
                }

                const city = await ctx.call('v1.cities.get', {id: place.city.toString(), fields: 'timeZoneId'});
                if (!city) {
                    throw new MoleculerServerError(ctx.meta.__('city-not-found'), 404);
                }

                const schedule = place.schedule;

                let result = true;

                if (isTest()) {
                    return {result};
                }

                let item = '';

                if (_.size(schedule)) {
                    if (_.size(schedule) === 1) {
                        item = schedule[0];
                    } else if (_.size(schedule) === 7) {
                        let day = _.parseInt(moment.tz(city.timeZoneId).format('d'));
                        day = day === 0 ? 6 : day - 1;
                        item = schedule[day];
                    }
                    if (item === 'off') {
                        result = false;
                    } else if (item.start === item.end) {
                        result = true;
                    } else {
                        let start = _.parseInt(item.start.replace(':', ''));
                        let end = _.parseInt(item.end.replace(':', ''));
                        let cur = _.parseInt(moment.tz(city.timeZoneId).format('kmm'));
                        if (start < end) {
                            if (cur < start || cur > end) {
                                result = false;
                            }
                        } else {
                            if (cur > end && cur < start) {
                                result = false;
                            }
                        }
                    }
                }

                return {result};

            },
        },
        workTime: {
            rest: 'GET /customer/work-time/:placeid',
            cache: false,
            params: {
                placeid: 'objectID',
            },
            async handler(ctx) {

                const placeid = ctx.params.placeid;
                const place = await ctx.call('v1.places.get', {id: placeid, fields: 'schedule city'});
                if (!place) {
                    throw new MoleculerServerError(ctx.meta.__('place-not-found'), 404);
                }

                const city = await ctx.call('v1.cities.get', {id: place.city.toString(), fields: 'country timeZoneId'});
                if (!city) {
                    throw new MoleculerServerError(ctx.meta.__('city-not-found'), 404);
                }

                const country = await ctx.call('v1.countries.get', {id: city.country.toString(), fields: 'dateFormat timeFormat'});
                if (!country) {
                    throw new MoleculerServerError(ctx.meta.__('country-not-found'), 404);
                }

                moment.locale(global.LANG);

                let roundTheClock = false;

                const times = this.times();
                const start = times[0];
                const end = times[times.length - 1];

                const days = [{start, end}, {start, end}, {start, end}, {start, end}, {start, end}, {start, end}, {start, end}];

                const schedule = place.schedule;

                if (_.size(schedule)) {
                    if (_.size(schedule) === 7) {
                        days[1] = schedule[0];
                        days[2] = schedule[1];
                        days[3] = schedule[2];
                        days[4] = schedule[3];
                        days[5] = schedule[4];
                        days[6] = schedule[5];
                        days[0] = schedule[6];
                    } else {
                        for (let i = 0; i < days.length; i++) {
                            days[i] = schedule[0];
                        }
                    }
                } else {
                    roundTheClock = true;
                }

                const today = moment.tz(city.timeZoneId).day();

                const result = {days: []};

                for (let i = 0; i < days.length; i++) {

                    let day = days[i];

                    let value = '';

                    if (roundTheClock) {
                        value += ctx.meta.__('round-the-clock');
                    } else {
                        if (day === 'off') {
                            value += ctx.meta.__('day-off');
                        } else if (day.start === day.end) {
                            value += ctx.meta.__('round-the-clock');
                        } else {
                            value += `${this.toTwelveHours(day.start, country.timeFormat)} - ${this.toTwelveHours(day.end, country.timeFormat)}`;
                        }
                    }

                    result.days.push({name: _.upperFirst(moment.tz(city.timeZoneId).day(i).format('dd')), value: value});

                    if (i === today) {
                        result.time = value;
                        result.date = `${moment.tz(city.timeZoneId).format(country.dateFormat)} ${value}`;
                    }

                }

                if (global.LANG === 'ru') {
                    let sunday = result.days.shift();
                    result.days.push(sunday);
                }

                return result;

            }
        },
        selector: {
            rest: 'GET /places',
            cache: false,
            async handler(ctx) {
                return await this.adapter.model.find({}, 'id address').sort('order').exec();
            }
        },
    },
    methods: {
        times() {

            const times = [];

            for (let h = 0; h < 24; h++) {
                for (let m = 0; m < 60; m++) {
                    if (m % 15 === 0) {
                        let hour = h > 9 ? h.toString() : '0' + h;
                        let minute = m > 9 ? m.toString() : '0' + m;
                        times.push(hour + ':' + minute);
                    }
                }
            }

            return times;

        },
        toTwelveHours(time, timeFormat) {
            if (time === undefined) {
                return '';
            }
            if (timeFormat === 12) {
                time = time.toString().match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];
                if (_.size(time) > 1) {
                    time = time.slice(1);
                    time[5] = +time[0] < 12 ? ' AM' : ' PM';
                    time[0] = +time[0] % 12 || 12;
                }
                return _.join(time, '');
            } else {
                return time;
            }
        },
    },
};
