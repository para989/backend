const UIDGenerator = require('uid-generator');
const uidgen = new UIDGenerator(512, UIDGenerator.BASE62);

exports.generateToken = async () => {
    return await uidgen.generate();
}
