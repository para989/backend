const _ = require('lodash');
const nodemailer = require('nodemailer');
const htmlToText = require('nodemailer-html-to-text').htmlToText;
const {MoleculerServerError} = require('moleculer').Errors;
const Mailgen = require('mailgen');
const passwordGenerator = require('password-generator');
const {customAlphabet} = require('nanoid');
const nanoid = customAlphabet('0123456789', 4);
const {orderNumber} = require('../helpers/order');
const {format} = require('date-fns');
const {cost} = require('../helpers/cost');

const Queue = require('bull');
const sendEmailQueue = new Queue('send-email', {redis: global.REDIS});

module.exports = {
    name: 'email',
    version: 1,
    settings: {
        rest: '/v1',
    },
    events: {
        'order:created': {
            async handler(ctx) {

                const order = ctx.params.order;

                const place = await ctx.call('v1.places.get', {id: order.place.toString(), fields: 'email'});

                const emails = this.emails(_.get(place, 'email'));
                if (_.isEmpty(emails)) {
                    return;
                }

                const i18n = this.broker.metadata.i18n;

                const name = _.get(this.broker.metadata, 'name', global.DOMAIN);

                _.each(emails, email => {
                    const params = {};
                    params.to = {name, address: email};
                    params.subject = `${i18n.__('order')}: #${orderNumber(order.number, order.date)}`;
                    params.html = this.order(order);
                    sendEmailQueue.add(params, {removeOnComplete: true});
                });

            }
        },
        'password:created': {
            async handler(ctx) {

                const data = ctx.params.data;
                const name = data.name;
                const email = data.email;
                const password = data.password;

                const i18n = this.broker.metadata.i18n;

                const params = {};
                params.to = {name, address: email};
                params.subject = i18n.__('password-reset-title');
                params.html = this.password(name, email, password);
                sendEmailQueue.add(params, {removeOnComplete: true});

            }
        },
        'support:created': {
            async handler(ctx) {

                const emails = this.emails(_.get(this.broker.metadata, 'email.support'));
                if (_.isEmpty(emails)) {
                    return;
                }

                const support = ctx.params.support;
                const name = support.name;
                const email = support.email;
                const phone = support.phone;
                const message = support.message;
                const from = support.from;
                const address = support.address;
                const html = this.support(name, email, phone, message, from, address);

                const i18n = this.broker.metadata.i18n;

                _.each(emails, email => {
                    const params = {};
                    params.to = {name: i18n.__('support'), address: email};
                    params.subject = i18n.__('support');
                    params.html = html;
                    sendEmailQueue.add(params, {removeOnComplete: true});
                });

            }
        },
        'review:created': {
            async handler(ctx) {

                const emails = this.emails(_.get(this.broker.metadata, 'email.support'));
                if (_.isEmpty(emails)) {
                    return;
                }

                const review = ctx.params.review;
                const name = review.name;
                const email = review.email;
                const phone = review.phone;
                const rating = review.rating;
                const message = review.message;
                const photos = review.photos;
                const from = review.from;
                const address = review.address;
                const html = this.review(name, email, phone, rating, message, photos, from, address);

                const i18n = this.broker.metadata.i18n;

                _.each(emails, email => {
                    const params = {};
                    params.to = {name: i18n.__('review'), address: email};
                    params.subject = i18n.__('review');
                    params.html = html;
                    sendEmailQueue.add(params, {removeOnComplete: true});
                });

            }
        },
        'code:created': {
            async handler(ctx) {

                if (_.get(this.broker.metadata, 'authorization') !== 'email') {
                    return;
                }

                const customer = ctx.params.customer;
                const name = customer.name;
                const email = customer.email;
                const code = nanoid();

                const i18n = this.broker.metadata.i18n;

                const params = {};
                params.to = {name, address: email};
                params.subject = i18n.__('code-title');
                params.html = this.code(name, code);
                sendEmailQueue.add(params, {removeOnComplete: true});

                await this.broker.cacher.client.set(email, code);

            }
        },
        'mystery-shopper:created': {
            async handler(ctx) {

                const emails = this.emails(_.get(this.broker.metadata, 'email.support'));
                if (_.isEmpty(emails)) {
                    return;
                }

                const customer = ctx.params.customer;
                const place = ctx.params.place;

                const name = customer.name;
                const email = customer.email;
                const phone = customer.phone;
                const message = ctx.params.message;
                const address = place.address;

                const html = this.mysteryShopper(name, email, phone, message, address);

                const i18n = this.broker.metadata.i18n;

                _.each(emails, email => {
                    const params = {};
                    params.to = {name: i18n.__('mystery-shopper-title'), address: email};
                    params.subject = i18n.__('mystery-shopper-title');
                    params.html = html;
                    sendEmailQueue.add(params, {removeOnComplete: true});
                });

            }
        },
    },
    async created() {
        sendEmailQueue.process(this.send);
    },
    actions: {
        // v1.email.order
        order: {
            rest: 'GET /email/order/:orderid',
            params: {
                orderid: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.orderid;

                const order = await ctx.call('v1.orders.get', {id});
                if (!order) {
                    throw new MoleculerServerError(ctx.meta.__('order-not-found'), 404);
                }

                return this.order(order);

            },
        },
        // v1.email.password
        password: {
            rest: 'GET /email/password/:userid',
            params: {
                userid: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.userid;

                const user = await ctx.call('v1.users.get', {id});
                if (!user) {
                    throw new MoleculerServerError(ctx.meta.__('user-not-found'), 404);
                }

                return this.password(user.name, user.email, passwordGenerator(8, true));

            },
        },
        // v1.email.support
        support: {
            rest: 'GET /email/support/:supportid',
            params: {
                supportid: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.supportid;

                const support = await ctx.call('v1.support.get', {id});
                if (!support) {
                    throw new MoleculerServerError(ctx.meta.__('support-not-found'), 404);
                }

                let address;
                if (support.place) {
                    const place = await ctx.call('v1.places.get', {id: support.place.toString(), fields: 'address'});
                    if (place) {
                        address = place.address;
                    }
                }

                return this.support(support.name, support.email, support.phone, support.message, support.from, address);

            },
        },
        // v1.email.review
        review: {
            rest: 'GET /email/review/:reviewid',
            params: {
                reviewid: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.reviewid;

                const review = await ctx.call('v1.reviews.get', {id});
                if (!review) {
                    throw new MoleculerServerError(ctx.meta.__('review-not-found'), 404);
                }

                let address;
                if (review.place) {
                    const place = await ctx.call('v1.places.get', {id: review.place.toString(), fields: 'address'});
                    if (place) {
                        address = place.address;
                    }
                }

                const customer = await ctx.call('v1.customers.get', {id: review.author.toString(), fields: 'name phone email'});

                return this.review(customer.name, customer.email, customer.phone, review.rating, review.message, review.photos, review.from, address);

            },
        },
        // v1.email.code
        code: {
            rest: 'GET /email/code/:customerid',
            params: {
                customerid: 'objectID',
            },
            async handler(ctx) {

                const id = ctx.params.customerid;

                const customer = await ctx.call('v1.customers.get', {id});
                if (!customer) {
                    throw new MoleculerServerError(ctx.meta.__('customer-not-found'), 404);
                }

                return this.code(customer.name, nanoid());

            },
        },
    },
    methods: {
        emails(value) {
            const items = _.split(value, ',');
            const emails = [];
            _.each(items, item => {
                emails.push(_.toLower(_.trim(item)));
            });
            return emails;
        },
        order(order) {

            const i18n = this.broker.metadata.i18n;
            const dateAndTimeFormat = i18n.__('date-and-time-format');

            const arr = [];
            arr.push(`<strong>${i18n.__('date')}:</strong> ${format(order.date, dateAndTimeFormat)}`);
            arr.push(`<strong>${i18n.__('obtaining')}:</strong> ${_.toLower(i18n.__(order.obtaining))}`);
            if (order.obtaining === 'delivery') {
                arr.push(`<strong>${i18n.__('address')}:</strong> ${order.address}`);
            }
            arr.push(`<strong>${i18n.__('name')}:</strong> ${order.name}`);
            if (order.phone) {
                arr.push(`<strong>${i18n.__('phone')}:</strong> ${order.phone}`);
            }
            if (order.email) {
                arr.push(`<strong>${i18n.__('email')}:</strong> ${order.email}`);
            }
            if (order.desiredTime) {
                arr.push(`<strong>${i18n.__('desired-time')}:</strong> ${format(order.desiredTime, dateAndTimeFormat)}`);
            }
            if (order.wishes) {
                arr.push(`<strong>${i18n.__('wishes')}:</strong> ${order.wishes}`);
            }

            const data = [];
            let push = {};

            _.each(order.items, item => {

                let text = `${item.name}`;
                if (_.size(item.modifiers)) {
                    const arr = [];
                    _.each(item.modifiers, modifier => {
                        arr.push(`${_.toLower(modifier.name)} x ${modifier.quantity}`);
                    });
                    text += `<br><i>${i18n.__('modifiers')}: ${_.join(arr, ', ')}</i><br>`;
                }

                push = {}
                push[i18n.__('item')] = text;
                push[i18n.__('price')] = `${item.quantity} x ${cost(item.amount)} = ${cost(item.quantity * item.amount)}`;
                data.push(push);

            });

            if (order.discount) {
                push = {};
                push[i18n.__('item')] = '';
                push[i18n.__('price')] = `${i18n.__('discount')}: ${cost(order.discount)}`;
                data.push(push);
            }

            push = {};
            push[i18n.__('item')] = '';
            push[i18n.__('price')] = `${i18n.__('total')}: ${cost(order.amount)}`;
            data.push(push);

            const customWidth = {};
            customWidth[i18n.__('price')] = '30%';

            const customAlignment = {};
            customAlignment[i18n.__('price')] = 'right';

            const body = {
                title: `${i18n.__('order')}: #${orderNumber(order.number, order.date)}`,
                intro: [
                    _.join(arr, '<br>'),
                ],
                table: {
                    data,
                    columns: {
                        customWidth,
                        customAlignment,
                    },
                },
                signature: i18n.__('sincerely'),
            };

            return this.generate({body});

        },
        password(name, email, password) {

            const i18n = this.broker.metadata.i18n;

            const body = {
                title: i18n.__('password-reset-title'),
                intro: [
                    i18n.__('password-reset-message'),
                    `<strong>${i18n.__('password')}:</strong> ${password}`,
                ],
                signature: i18n.__('sincerely'),
            };

            return this.generate({body});

        },
        support(name, email, phone, message, from, address) {

            const i18n = this.broker.metadata.i18n;

            const source = [];
            source.push(`<strong>${i18n.__('source')}:</strong> ${_.toLower(i18n.__(from || 'app'))}`);
            if (address) {
                source.push(`<strong>${i18n.__('place')}:</strong> ${address}`);
            }

            const user = [];
            user.push(`<strong>${i18n.__('name')}:</strong> ${name}`);
            user.push(`<strong>${i18n.__('phone')}:</strong> ${phone}`);
            user.push(`<strong>${i18n.__('email')}:</strong> ${email}`);

            const body = {
                title: i18n.__('support'),
                intro: [
                    _.join(source, '<br>'),
                    _.join(user, '<br>'),
                    `<strong>${i18n.__('message')}:</strong> ${message}`,
                ],
                signature: i18n.__('sincerely'),
            };

            return this.generate({body});

        },
        review(name, email, phone, rating, message, photos, from, address) {

            const i18n = this.broker.metadata.i18n;

            const source = [];
            source.push(`<strong>${i18n.__('source')}:</strong> ${_.toLower(i18n.__(from || 'app'))}`);
            if (address) {
                source.push(`<strong>${i18n.__('place')}:</strong> ${address}`);
            }

            const user = [];
            user.push(`<strong>${i18n.__('name')}:</strong> ${name}`);
            if (phone) {
                user.push(`<strong>${i18n.__('phone')}:</strong> ${phone}`);
            }
            if (email) {
                user.push(`<strong>${i18n.__('email')}:</strong> ${email}`);
            }

            const review = [];
            review.push(`<strong>${i18n.__('rating')}:</strong> ${rating}`);
            review.push(`<strong>${i18n.__('message')}:</strong> ${message}`);
            if (_.size(photos)) {
                review.push(`<strong>${i18n.__('photo')}:</strong>`);
                _.each(photos, photo => {
                    const url = `https://${global.DOMAIN}/v1/images/${photo.picture}`;
                    review.push(`<a href="${url}" target="_blank"><img width="500" height="500" src="${url}"></a>`);
                });
            }

            const body = {
                title: i18n.__('review'),
                intro: [
                    _.join(source, '<br>'),
                    _.join(user, '<br>'),
                    _.join(review, '<br>'),
                ],
                signature: i18n.__('sincerely'),
            };

            return this.generate({body});

        },
        code(name, code) {

            const i18n = this.broker.metadata.i18n;

            const body = {
                title: i18n.__('code-title'),
                intro: [
                    i18n.__('code-message'),
                    `<strong>${i18n.__('code')}:</strong> ${code}`,
                ],
                signature: i18n.__('sincerely'),
            };

            return this.generate({body});

        },
        mysteryShopper(name, email, phone, message, address) {

            const i18n = this.broker.metadata.i18n;

            const source = [];
            source.push(`<strong>${i18n.__('place')}:</strong> ${address}`);

            const user = [];
            user.push(`<strong>${i18n.__('name')}:</strong> ${name}`);
            if (phone) {
                user.push(`<strong>${i18n.__('phone')}:</strong> ${phone}`);
            }
            if (email) {
                user.push(`<strong>${i18n.__('email')}:</strong> ${email}`);
            }

            const intro = [
                _.join(source, '<br>'),
                _.join(user, '<br>'),
            ];

            if (message) {
                intro.push(`<strong>${i18n.__('message')}:</strong> ${message}`);
            }

            const body = {
                title: i18n.__('mystery-shopper-title'),
                intro,
                signature: i18n.__('sincerely'),
            };

            return this.generate({body});

        },
        generate(data) {

            const i18n = this.broker.metadata.i18n;

            const name = _.get(this.broker.metadata, 'name', global.DOMAIN);
            const year = new Date().getFullYear();
            const product = {
                name,
                link: `https://${global.DOMAIN}/`,
                copyright: i18n.__('copyright', year, name),
            };
            const logo = _.get(this.broker.metadata, 'logo');
            if (logo) {
                product.logo = `https://${global.DOMAIN}/v1/images/${logo}`;
            }

            const mailGenerator = new Mailgen({theme: 'default', product});

            return mailGenerator.generate(data);

        },
        async send(job, done) {

            const name = _.get(this.broker.metadata, 'name', global.DOMAIN);
            const smtp = _.get(this.broker.metadata, 'email.smtp');
            const email = _.get(this.broker.metadata, 'email.primary');

            if (_.isEmpty(smtp) || _.isEmpty(email)) {
                return done();
            }

            const params = job.data;

            const transporter = nodemailer.createTransport(smtp);
            transporter.use('compile', htmlToText());

            const mailOptions = {};
            if (params.to) {
                mailOptions['to'] = params.to;
            } else {
                mailOptions['to'] = {name, address: email};
            }
            if (params.from) {
                mailOptions['from'] = params.from;
            } else {
                mailOptions['from'] = {name, address: email};
            }
            if (params.replyTo) {
                mailOptions['replyTo'] = params.replyTo;
            }
            mailOptions['subject'] = params.subject;
            mailOptions['html'] = params.html;

            await transporter.sendMail(mailOptions).catch(err => {
                done(err);
            }).then(done);

        },
    },
};
