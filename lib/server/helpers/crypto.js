const crypto = require('crypto');

exports.sha256 = (str) => {
    return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

exports.md5 = (str) => {
    return crypto.createHash('md5').update(str, 'utf8').digest('hex');
}
