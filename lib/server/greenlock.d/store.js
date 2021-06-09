const _ = require('lodash');

const mongoose = require('mongoose');
mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);
mongoose.connect(global.MONGODB, {useNewUrlParser: true, useUnifiedTopology: true});

const acmeSchema = mongoose.Schema({
    key: mongoose.Schema.Types.String,
    value: mongoose.Schema.Types.String,
}, {collection: 'acme', versionKey: false});
acmeSchema.index({'key': 1});
const ACME = mongoose.model('AcmeData', acmeSchema);

module.exports.create = function (opts) {

    async function saveKeypair(id, value) {
        const key = `ssl/keypairs/${id}.json`;
        await ACME.updateOne({key}, {key, value}, {upsert: true});
        return null;
    }

    async function getKeypair(id) {
        const key = `ssl/keypairs/${id}.json`;
        const data = await ACME.findOne({key}).exec();
        return _.get(data, 'value');
    }

    async function saveCertificate(id, value) {
        const key = `ssl/certificates/${id}.json`;
        await ACME.updateOne({key}, {key, value}, {upsert: true});
        return null;
    }

    async function getCertificate(id) {
        const key = `ssl/certificates/${id}.json`;
        const data = await ACME.findOne({key}).exec();
        return _.get(data, 'value');
    }

    const store = {
        accounts: {},
        certificates: {},
    };

    store.accounts.setKeypair = async function (opts) {
        const id = opts.account.id || opts.email || 'default';
        const keypair = opts.keypair;
        return await saveKeypair(id, JSON.stringify({
            privateKeyPem: keypair.privateKeyPem,
            privateKeyJwk: keypair.privateKeyJwk
        }));
    };

    store.accounts.checkKeypair = async function (opts) {
        const id = opts.account.id || opts.email || 'default';
        const keyblob = await getKeypair(id);
        if (!keyblob) {
            return null;
        }
        return JSON.parse(keyblob);
    };

    store.certificates.setKeypair = async function (opts) {
        const id = _.get(opts, 'certificate.kid') || _.get(opts, 'certificate.id') || opts.subject;
        const keypair = opts.keypair;
        return await saveKeypair(id, JSON.stringify({
            privateKeyPem: keypair.privateKeyPem,
            privateKeyJwk: keypair.privateKeyJwk
        }));
    };

    store.certificates.checkKeypair = async function (opts) {
        const id = _.get(opts, 'certificate.kid') || _.get(opts, 'certificate.id') || opts.subject;
        const keyblob = await getKeypair(id);
        if (!keyblob) {
            return null;
        }
        return JSON.parse(keyblob);
    };

    store.certificates.set = async function (opts) {
        const id = _.get(opts, 'certificate.id') || opts.subject;
        const pems = opts.pems;
        return await saveCertificate(id, JSON.stringify({
            cert: pems.cert,
            chain: pems.chain,
            subject: pems.subject,
            altnames: pems.altnames,
            issuedAt: pems.issuedAt,
            expiresAt: pems.expiresAt
        }));
    };

    store.certificates.check = async function (opts) {
        const id = _.get(opts, 'certificate.id') || opts.subject;
        const certblob = await getCertificate(id);
        if (!certblob) {
            return null;
        }
        return JSON.parse(certblob);
    };

    return store;

};
