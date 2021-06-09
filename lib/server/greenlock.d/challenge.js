const Redis = require('ioredis');
const redis = new Redis(global.REDIS);

module.exports.create = function (options) {

    const challenge = {};
    const hashKey = 'acme-challenges';

    function hashField(domain, token) {
        return `${domain}:${token}`;
    }

    challenge.set = async function ({challenge}) {
        const {altname, keyAuthorization, token} = challenge;
        await redis.hset(hashKey, hashField(altname, token), keyAuthorization);
        return null;
    }

    challenge.get = async function ({challenge}) {
        const {identifier, token} = challenge;
        const domain = identifier.value;
        const secret = await redis.hget(hashKey, hashField(domain, token));
        return secret ? {keyAuthorization: secret} : null;
    }

    challenge.remove = async function ({challenge}) {
        const {identifier, token} = challenge;
        const domain = identifier.value;
        await redis.hdel(hashKey, hashField(domain, token));
        return null;
    }

    return challenge;

}
