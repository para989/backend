const {MoleculerServerError} = require('moleculer').Errors;
const fs = require('fs-extra');
const mime = require('mime-types');
const _ = require('lodash');
const os = require('os');
const path = require('path');
const dir = path.join(os.homedir(), 'content');

const AWS = require('aws-sdk');
const s3 = new AWS.S3(global.STORAGE);
const backet = _.get(global.STORAGE, 'backet');

module.exports = {
    name: 'storage',
    actions: {
        list: {
            async handler(ctx) {
                if (global.STORAGE) {
                    const obj = await s3.listObjects({Bucket: backet, Prefix: ctx.params.prefix}).promise();
                    const keys = [];
                    _.each(obj.Contents, content => {
                        keys.push(content.Key);
                    });
                    return keys;
                } else {
                    const dirPath = path.join(dir, ctx.params.prefix);
                    const keys = [];
                    if (fs.pathExistsSync(dirPath)) {
                        fs.readdirSync(dirPath).forEach(file => {
                            file = path.join(dirPath, file);
                            file = _.replace(file, `${dir}/`, '');
                            keys.push(file);
                        });
                    }
                    return keys;
                }
            }
        },
        get: {
            async handler(ctx) {
                if (global.STORAGE) {
                    const obj = await s3.getObject({Bucket: backet, Key: ctx.params.key}).promise();
                    if (ctx.params.filePath) {
                        fs.ensureFileSync(ctx.params.filePath);
                        fs.writeFileSync(ctx.params.filePath, obj.Body);
                    }
                    return obj;
                } else {
                    const filePath = path.join(dir, ctx.params.key);
                    if (fs.pathExistsSync(filePath)) {
                        return {Body: fs.readFileSync(filePath/*, 'utf-8'*/)};
                    } else {
                        throw new MoleculerServerError(ctx.meta.__('file-not-found'), 404);
                    }
                }
            }
        },
        put: {
            async handler(ctx) {
                if (global.STORAGE) {
                    return await s3.putObject({
                        Bucket: backet,
                        Key: ctx.params.key,
                        Body: ctx.params.body,
                        ACL: 'public-read',
                        ContentType: mime.lookup(ctx.params.key).toString()
                    }).promise();
                } else {
                    const filePath = path.join(dir, ctx.params.key);
                    fs.ensureFileSync(filePath);
                    fs.writeFileSync(filePath, ctx.params.body);
                }
            }
        },
        remove: {
            async handler(ctx) {
                if (global.STORAGE) {
                    if (ctx.params.keys) {
                        const objects = [];
                        _.each(ctx.params.keys, key => {
                            objects.push({Key: key});
                        });
                        return await s3.deleteObjects({
                            Bucket: backet,
                            Delete: {
                                Objects: objects,
                            },
                        }).promise();
                    } else {
                        return await s3.deleteObject({
                            Bucket: backet,
                            Key: ctx.params.key
                        }).promise();
                    }
                } else {
                    if (ctx.params.keys) {
                        _.each(ctx.params.keys, key => {
                            const filePath = path.join(dir, key);
                            if (fs.pathExistsSync(filePath)) {
                                fs.removeSync(filePath);
                            }
                        });
                    } else {
                        const filePath = path.join(dir, ctx.params.key);
                        if (fs.pathExistsSync(filePath)) {
                            fs.removeSync(filePath);
                        }
                    }
                }
            }
        }
    }
};
