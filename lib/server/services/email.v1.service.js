const _ = require('lodash');
const path = require('path');
const nodemailer = require('nodemailer');
const htmlToText = require('nodemailer-html-to-text').htmlToText;
const {MoleculerServerError} = require('moleculer').Errors;
const ejs = require('ejs');
const BootstrapEmail = require('bootstrap-email'); // https://bootstrapemail.com/
const Mailgen = require('mailgen');
const Queue = require('bull');
const emailQueue = new Queue('email', {redis: global.REDIS});

module.exports = {
    name: 'email',
    version: 1,
    events: {
        'order:created': {
            async handler(ctx) {
                /*const order = ctx.params;
                const i18n = this.broker.metadata.i18n;
                i18n.setLocale(site.lang);
                const params = {};
                params.subject = `${i18n.__('order')}: ${orderNumber(order.number)}`;
                params.html = await this.actions.message({type: 'order', id: _.toString(order._id)});
                params.to = {name: user.name, address: user.email};
                if (order.name && order.email) {
                    params.replyTo = {name: order.name, address: order.email};
                }
                emailQueue.add(params, {removeOnComplete: true});*/
            }
        },
    },
    async started() {
        emailQueue.process(this.send);
    },
    actions: {
        passwordRecovery: {
            params: {
                name: 'string',
                email: 'email',
                password: 'string',
            },
            async handler(ctx) {

                const text = [
                    ctx.meta.__('password-reset-message')
                ];
                text.push(`<strong>${ctx.meta.__('email')}:</strong> ${ctx.params.email}
                           <br>
                           <strong>${ctx.meta.__('your-password')}:</strong> ${ctx.params.password}`);

                const email = {
                    body: {
                        title: ctx.meta.__('greeting', ctx.params.name),
                        intro: text,
                        signature: ctx.meta.__('signature'),
                    }
                };


                const params = {};
                params.to = {name: ctx.params.name, address: ctx.params.email};
                params.subject = ctx.meta.__('password-reset-title');
                params.html = this.generate(ctx, email);

                emailQueue.add(params, {removeOnComplete: true});

                return this.generate(ctx, email);

            },
        },
        // v1.email.message
        message: {
            params: {
                type: {
                    type: 'string',
                    enum: ['order'],
                },
                id: 'objectID',
            },
            async handler(ctx) {

                const type = ctx.params.type;
                const id = ctx.params.id;
                // const i18n = this.broker.metadata.i18n;

                const link = `https://${global.DOMAIN}/`;
                const name = _.get(this.broker.metadata, 'name');
                const product = {
                    name,
                    link,
                    copyright: `&copy; ${new Date().getFullYear()} <a href="${link}" target="_blank">${name}</a>. All rights reserved.`,
                };
                const body = {
                    /*title: 'Hi John Appleseed,',
                    intro: [
                        '<strong>Welcome</strong> to Mailgen! We\'re very excited to have you on board.',
                        '<strong>Welcome</strong> to Mailgen! We\'re very excited to have you on board.',
                    ],


                    action: {
                        instructions: 'To get started with Mailgen, please click here:',
                        button: {
                            color: '#22BC66', // Optional action button color
                            text: 'Confirm your account',
                            link: 'https://mailgen.js/confirm?s=d9729feb74992cc3482b350163a1a010'
                        },
                    },
                    outro: 'Need help, or have questions? Just reply to this email, we\'d love to help.',
                    signature: 'Sincerely',*/
                };

                switch (type) {
                    case 'order':
                        /*
                        file = 'order.ejs';

                        i18n.setLocale(site.lang);

                        data.title = `${i18n.__('order-number')}: ${orderNumber(order.number)}`;

                        data.order = [];
                        _.each(order.items, item => {
                            data.order.push({
                                name: item.name,
                                description: item.description,
                                sum: `${item.price} x ${item.quantity} = ${item.price * item.quantity}`,
                            });
                        });
                        data.amount = order.amount;

                        data.phrases = {
                            product: i18n.__('product'),
                            price: i18n.__('price'),
                            total: i18n.__('total'),
                            name: i18n.__('name'),
                            email: i18n.__('email'),
                            phone: i18n.__('phone'),
                            address: i18n.__('address'),
                            payment: i18n.__('payment-method'),
                            method: i18n.__('obtaining'),
                        };

                        data.name = order.name;
                        data.email = order.email;
                        data.phone = order.phone;
                        data.address = `${order.postalcode}, ${order.country}, ${order.city}, ${order.address}`;
                        data.payment = i18n.__(`payment-${order.payment}`);
                        data.method = i18n.__(order.method);*/

                        body.table = {
                            data: [
                                {
                                    item: 'Node.js',
                                    description: 'Event-driven I/O server-side JavaScript environment based on V8.',
                                    price: '$10.99',
                                },
                                {
                                    item: 'Mailgen',
                                    description: 'Programmatically create beautiful e-mails using plain old JavaScript.',
                                    price: '$1.99',
                                },
                            ],
                            columns: {
                                customWidth: {
                                    item: '20%',
                                    price: '15%',
                                },
                                customAlignment: {
                                    price: 'right',
                                }
                            },
                        };

                        break;
                }

                const mailGenerator = new Mailgen({theme: 'salted', product});

                return mailGenerator.generate({body});

            },
        },
        // v1.email.send
        send: {
            async handler(ctx) {
                const data = {
                    subject: ctx.params.subject,
                    message: ctx.params.message,
                    image: `${global.DOMAIN}images/email/${ctx.params.type}.png`,
                };
                const params = _.cloneDeep(ctx.params);

                params.html = await this.compile('message.ejs', data);
                // emailQueue.add(params, {removeOnComplete: true});

            }
        },

    },
    methods: {


        async compile(file, data) {
            const template = path.join(__dirname, '..', 'views/email', file);
            return new Promise((resolve, reject) => {
                ejs.renderFile(template, data, (err, html) => {
                    if (err) {
                        reject(err);
                    } else {
                        const template = new BootstrapEmail(_.trim(html));
                        resolve(template.compile());
                    }
                });
            });
        },
        async send(job, done) {

            const params = job.data;

            const transporter = nodemailer.createTransport(_.get(this.broker.metadata, 'smtp'));
            transporter.use('compile', htmlToText());
            const mailOptions = {};
            if (params.to) {
                mailOptions['to'] = params.to;
            } else {
                mailOptions['to'] = {name: _.get(this.broker.metadata, 'name'), address: _.get(this.broker.metadata, 'email')};
            }
            if (params.from) {
                mailOptions['from'] = params.from;
            } else {
                mailOptions['from'] = {name: _.get(this.broker.metadata, 'name'), address: _.get(this.broker.metadata, 'email')};
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
        generate(ctx, data) {

            const product = {
                name: _.get(this.broker.metadata, 'name'),
                link: `https://${global.DOMAIN}/`,
                logo: `https://${global.DOMAIN}/images/logo-apps.png`,
                copyright: ctx.meta.__('copyright', _.get(this.broker.metadata, 'name'), _.get(this.broker.metadata, 'name')),
            };

            const mailGenerator = new Mailgen({theme: 'default', product});

            return mailGenerator.generate(data);

        },
    },
};
