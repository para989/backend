const _ = require('lodash');

exports.removeQuestion = (str) => {
    return _.split(str, '?')[0];
}
