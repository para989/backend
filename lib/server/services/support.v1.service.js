const _ = require('lodash');
const DbService = require('moleculer-db');
const MongooseAdapter = require('moleculer-db-adapter-mongoose');
const SupportModel = require('../models/support.model');
const MongooseMixin = require('../mixins/mongoose.mixin');
const {clearPhone} = require('../helpers/phone');

module.exports = {
    name: "support",
    version: 1,
    mixins: [DbService, MongooseMixin],
    adapter: new MongooseAdapter(global.MONGODB, {useUnifiedTopology: true}),
    model: SupportModel,
    actions: {
        get: {
            cache: false,
        },
        find: {
            cache: false,
        },
        send: {
            params: {
                name: {
                    type: "string",
                },
                email: {
                    type: "email",
                },
                message: {
                    type: "string",
                },
                phone: {
                    type: "string",
                    optional: true,
                },
            },
            async handler(ctx) {

                const name = _.trim(ctx.params.name);
                const message = _.trim(ctx.params.message);
                const email = _.toLower(ctx.params.email);
                const phone = clearPhone(ctx.params.phone);

                await ctx.call('v1.support.create', {
                    name,
                    email,
                    phone,
                    message,
                });

                /*const type = 'support';
                const replyTo = {name: ctx.params.name, address: email};
                const subject = ctx.meta.__('support');
                const arr = [];
                arr.push(`<strong>${ctx.meta.__('username')}:</strong> ${ctx.params.name}`);
                arr.push(`<strong>${ctx.meta.__('email')}:</strong> ${email}`);
                arr.push(`<strong>${ctx.meta.__('message')}:</strong> ${ctx.params.message}`);
                const message = _.join(arr, '<br>');
                await ctx.call('v1.email.send', {type, replyTo, subject, message});*/

                return true;

            }
        },

    }

};
