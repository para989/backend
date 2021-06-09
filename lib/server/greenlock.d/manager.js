const _ = require('lodash');

const mongoose = require('mongoose');
mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);
mongoose.connect(global.MONGODB, {useNewUrlParser: true, useUnifiedTopology: true});

const schema = mongoose.Schema({
    domain: mongoose.Schema.Types.String,
    renewAt: mongoose.Schema.Types.Mixed,
    deletedAt: mongoose.Schema.Types.Mixed,
}, {collection: 'domains', versionKey: false});
schema.index({'domain': 1});
const Domains = mongoose.model('AcmeDomain', schema);

module.exports.create = function (opts) {

    const manager = {};

    manager.set = async function (opts) {
        await Domains.updateOne({domain: _.toLower(opts.domain)}, {renewAt: opts.renewAt, deletedAt: opts.deletedAt});
        return null;
    };

    manager.find = async function ({servername}) {
        const result = [];
        if (servername) {
            const domain = _.toLower(servername);
            const data = await Domains.findOne({domain}, 'domain renewAt deletedAt').exec();
            if (data) {
                const push = {subject: data.domain, altnames: [data.domain]};
                if (data.renewAt) {
                    push.renewAt = data.renewAt;
                }
                if (data.deletedAt) {
                    push.deletedAt = data.deletedAt;
                }
                result.push(push);
            }
        }
        if (_.isEmpty(result)) {
            const domains = await Domains.find({}, 'domain renewAt deletedAt').exec();
            _.each(domains, data => {
                const push = {subject: data.domain, altnames: [data.domain]};
                if (data.renewAt) {
                    push.renewAt = data.renewAt;
                }
                if (data.deletedAt) {
                    push.deletedAt = data.deletedAt;
                }
                result.push(push);
            });
        }
        return _.isEmpty(result) ? undefined : result;
    };

    return manager;

};
