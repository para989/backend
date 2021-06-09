const _ = require('lodash');
const {MoleculerServerError} = require('moleculer').Errors;
const mongoose = require('mongoose');
const fileExtension = require('file-extension');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const sharp = require('sharp');
const smartcrop = require('smartcrop-sharp');
const imagemin = require('imagemin');
const imageminJpegtran = require('imagemin-jpegtran');
const imageminPngquant = require('imagemin-pngquant');
const embedVideo = require('embed-video');
const getTitleAtUrl = require('get-title-at-url');
const qrImage = require('qr-image');
const urllib = require('urllib');
const {isTest} = require("../helpers/test");
const {removeQuestion} = require("../helpers/remove-question");
const {md5} = require("../helpers/crypto");
const uploadDir = path.join(os.tmpdir(), 'upload');

const noPhoto = fs.readFileSync(path.join(__dirname, '../assets/images/no-photo.png'));
const noAvatar = fs.readFileSync(path.join(__dirname, '../assets/images/no-avatar.png'));

const noAppBanner = fs.readFileSync(path.join(__dirname, '../assets/images/no-app-banner.png'));
const noSiteBanner = fs.readFileSync(path.join(__dirname, '../assets/images/no-site-banner.png'));

const cache = !isTest();

module.exports = {
    name: 'images',
    version: 1,
    dependencies: [
        'storage',
    ],
    settings: {
        rest: '/v1',
    },
    created() {
        fs.ensureDirSync(uploadDir);
    },
    actions: {
        photo: {
            async handler(ctx) {

                const imageid = new mongoose.Types.ObjectId();
                const ext = fileExtension(ctx.meta.filename);
                const regularName = `${imageid}.${ext}`;
                if (ext !== 'jpeg' && ext !== 'jpg' && ext !== 'png') {
                    throw new MoleculerServerError('Wrong image type');
                }
                const filePath = path.join(uploadDir, regularName);
                await new this.Promise((resolve, reject) => {
                    const fileStream = fs.createWriteStream(filePath);
                    fileStream.on('close', async () => {
                        resolve();
                    });
                    fileStream.on('error', err => reject(err));
                    ctx.params.pipe(fileStream);
                });

                const source = await sharp(filePath).toBuffer();
                let original, thumbnail;
                if (ext === 'png') {
                    original = await sharp(source).resize({
                        width: 1480,
                        height: 1480,
                        fit: 'inside'
                    }).toFormat('png').toBuffer({resolveWithObject: true});
                } else {
                    original = await sharp(source).resize({
                        width: 1480,
                        height: 1480,
                        fit: 'inside'
                    }).jpeg({quality: 95}).toFormat('jpeg').toBuffer({resolveWithObject: true});
                }

                /*switch ('smart') {
                    case 'overlay':
                        thumbnail = await sharp(source).resize({width: size, height: size, background: {r: 0, g: 0, b: 0, alpha: 0}}).embed().toFormat('png').toBuffer();
                        thumbnail = await sharp(source).resize({width: 512, height: 512}).toFormat('jpeg').blur(20).overlayWith(overlay, {gravity: 'centre'}).toBuffer();
                        break;
                    case 'additive':
                        getColors(source, 'image/jpeg', function (err, colors) {
                            if (err) {
                                callback(err);
                            } else {
                                const rgb = colors[0].rgb();
                                sharp(source).resize({width: size, height: size, background: {r: rgb[0], g: rgb[1], b: rgb[2], alpha: 1}}).embed().toFormat('jpeg').toBuffer(callback);
                            }
                        });
                        break;
                    case 'pruning':
                        sharp(source).resize({width: size, height: size, background: 'white'}).flatten(true).toFormat('jpeg').toBuffer(callback);
                        break;
                    default:
                    case 'smart':
                        const cropData = await smartcrop.crop(source, {width: 512, height: 512});
                        const crop = cropData.topCrop;
                        if (ext === 'png') {
                            thumbnail = await sharp(source).extract({left: crop.x, top: crop.y, width: crop.width, height: crop.height}).toBuffer();
                        } else {
                            thumbnail = await sharp(source).extract({left: crop.x, top: crop.y, width: crop.width, height: crop.height}).flatten({background: 'white'}).toFormat('jpeg').toBuffer();
                        }
                        break;
                }*/

                const cropData = await smartcrop.crop(source, {width: 512, height: 512});
                const crop = cropData.topCrop;
                if (ext === 'png') {
                    thumbnail = await sharp(source).extract({
                        left: crop.x,
                        top: crop.y,
                        width: crop.width,
                        height: crop.height
                    }).toBuffer();
                } else {
                    thumbnail = await sharp(source).extract({
                        left: crop.x,
                        top: crop.y,
                        width: crop.width,
                        height: crop.height
                    }).flatten({background: 'white'}).toFormat('jpeg').toBuffer();
                }

                await ctx.call('storage.put', {key: `images/${imageid}-original.jpg`, body: original.data});
                await ctx.call('storage.put', {key: `images/${imageid}-thumbnail.jpg`, body: thumbnail});

                return {
                    picture: `${imageid}-thumbnail.jpg`,
                    height: original.info.height,
                    width: original.info.width,
                };

            }
        },
        banner: {
            async handler(ctx) {

                const type = _.get(ctx.meta.headers, 'type');
                const imageid = new mongoose.Types.ObjectId();
                const ext = fileExtension(ctx.meta.filename);
                const name = `${imageid}.${ext}`;

                if (ext !== 'jpeg' && ext !== 'jpg') {
                    throw new MoleculerServerError('Wrong image type');
                }

                const file = path.join(uploadDir, name);

                await new this.Promise((resolve, reject) => {
                    const fileStream = fs.createWriteStream(file);
                    fileStream.on('close', async () => {
                        resolve();
                    });
                    fileStream.on('error', err => reject(err));
                    ctx.params.pipe(fileStream);
                });

                const source = await sharp(file).toBuffer();
                const banner = await sharp(source).resize({
                    width: 1920,
                    height: type === 'picture' ? 1080 : 560,
                    fit: 'fill'
                }).jpeg({quality: 95}).toFormat('jpeg').toBuffer({resolveWithObject: true});

                await ctx.call('storage.put', {key: `banners/${imageid}.jpg`, body: banner.data});

                return {file: `${imageid}.jpg`};

            }
        },
        crop: {
            async handler(ctx) {
                const picture = removeQuestion(ctx.params.picture);
                const buf = this.decodeBase64Image(ctx.params.file.toString());
                const imageData = await sharp(buf.data).resize(512, 512).toBuffer();
                await ctx.call('storage.put', {key: `images/${picture}`, body: imageData});
                return {picture: picture + '?' + Math.ceil(new Date().getTime() / 1000)};
            }
        },
        video: {
            async handler(ctx) {

                const url = ctx.params.url;
                const imageid = new mongoose.Types.ObjectId();

                try {
                    embedVideo(url);
                } catch (err) {
                    throw new MoleculerServerError('Video not found', 404);
                }

                const videoInfo = embedVideo.info(url);

                if (!_.includes(['youtube', 'vimeo'], videoInfo.source)) {
                    throw new MoleculerServerError('Invalid video source', 400);
                }

                const imageInfo = await new Promise(async (resolve) => {
                    let size;
                    switch (videoInfo.source) {
                        case 'youtube':
                            size = 'maxresdefault';
                            break;
                        case 'vimeo':
                            size = 'thumbnail_large';
                            break;

                    }
                    embedVideo.image(videoInfo.url, {image: size}, (err, data) => {
                        if (err) {
                            throw new MoleculerServerError('Invalid video image', 400);
                        } else {
                            resolve(data);
                        }
                    });
                });

                let title = await new Promise(async (resolve) => {
                    getTitleAtUrl(videoInfo.url, function (title) {
                        resolve(title);
                    });
                });

                title = _.replace(title, 'on VimeoMenuSearch', '');
                title = _.trim(title);

                const imageResponce = await urllib.request(`https:${imageInfo.src}`);

                if (imageResponce.status !== 200) {
                    throw new MoleculerServerError('Video image not found', 404);
                }

                const original = await sharp(imageResponce.data).toBuffer({resolveWithObject: true});
                const thumbnail = await sharp(imageResponce.data).resize(512, 512).toBuffer({resolveWithObject: true});
                const format = original.info.format === 'jpeg' ? 'jpg' : original.info.format;

                await ctx.call('storage.put', {key: `images/${imageid}-original.${format}`, body: original.data});
                await ctx.call('storage.put', {key: `images/${imageid}-thumbnail.${format}`, body: thumbnail.data});

                return {
                    picture: `${imageid}-thumbnail.${format}`,
                    name: title,
                    description: '',
                    videoid: videoInfo.id,
                    url,
                    width: original.info.width,
                    height: original.info.height,
                };

            }
        },
        avatar: {
            async handler(ctx) {

                // const userid = _.get(ctx, 'meta.user.id');

                const ext = fileExtension(ctx.meta.filename);
                const imageid = new mongoose.Types.ObjectId();
                const regularName = `${imageid}.${ext}`;
                const width = 512;
                const height = 512;
                if (ext !== 'jpeg' && ext !== 'jpg' && ext !== 'png') {
                    throw new MoleculerServerError('Wrong image type');
                }
                const filePath = path.join(uploadDir, regularName);
                await new this.Promise((resolve, reject) => {
                    const fileStream = fs.createWriteStream(filePath);
                    fileStream.on('close', async () => {
                        resolve();
                    });
                    fileStream.on('error', err => reject(err));
                    ctx.params.pipe(fileStream);
                });

                const imageData = await sharp(filePath).toBuffer({resolveWithObject: true});
                const cropData = await smartcrop.crop(imageData.data, {width: width, height: height});
                const crop = cropData.topCrop;
                let stream;
                if (ext === 'png') {
                    stream = await sharp(imageData.data).extract({
                        left: crop.x,
                        top: crop.y,
                        width: crop.width,
                        height: crop.height
                    }).resize(width, height).flatten({background: 'white'}).toFormat('jpeg').toBuffer();
                } else {
                    stream = await sharp(imageData.data).extract({
                        left: crop.x,
                        top: crop.y,
                        width: crop.width,
                        height: crop.height
                    }).resize(width, height).toBuffer();
                }

                await ctx.call('storage.put', {key: `avatars/${regularName}`, body: stream});

                const customerid = _.get(ctx.meta.headers, 'customerid');
                if (customerid) {
                    await ctx.call('v1.customers.updateOne', {filter: {_id: customerid}, doc: {avatar: regularName}});
                }

                const userid = _.get(ctx.meta.headers, 'userid');
                if (userid) {
                    await ctx.call('v1.users.updateOne', {filter: {_id: userid}, doc: {avatar: regularName}});
                }

                return {file: regularName};

            }
        },
        resize: {
            rest: 'GET /images/(avatar|image|banner)/:size/(.*)',
            cache: cache,
            params: {
                size: {
                    type: 'number',
                    convert: true,
                    min: 10,
                    max: 1920,
                },
            },
            async handler(ctx) {

                const kind = ctx.params[0];
                const size = _.parseInt(ctx.params.size);
                const storeFile = ctx.params[1];

                let ext = fileExtension(storeFile);
                if (ext !== 'jpg' && ext !== 'jpeg' && ext !== 'png') {
                    throw new MoleculerServerError('Wrong extension', 400);
                }

                const cacheFile = `${md5(JSON.stringify(ctx.params))}.${ext}`;
                const filePath = `${os.tmpdir()}/content/${kind}/${cacheFile}`;

                if (fs.existsSync(filePath)) {
                    return fs.readFileSync(filePath);
                } else {
                    let key;
                    switch (kind) {
                        case 'avatar':
                            key = 'avatars/' + storeFile;
                            break;
                        case 'image':
                            key = 'images/' + storeFile;
                            break;
                        case 'banner':
                            key = 'banners/' + storeFile;
                            break;
                    }

                    let notFound = false;

                    const obj = await ctx.call('storage.get', {key}).catch(async () => {
                        notFound = true;
                    });

                    if (notFound) {
                        let no;
                        switch (kind) {
                            case 'avatar':
                                no = noAvatar;
                                break;
                            case 'image':
                                no = noPhoto;
                                break;
                            case 'banner':
                                no = _.includes(storeFile, 'no-site-banner') ? noSiteBanner : noAppBanner;
                                break;
                        }
                        return await sharp(no).resize(size).toBuffer();
                    }

                    let image;
                    if (kind === 'video') {
                        image = await sharp(obj.Body).resize(size, size, {
                            background: {r: 0, g: 0, b: 0, alpha: 0},
                            fit: 'contain'
                        }).toBuffer();
                    } else {
                        image = await sharp(obj.Body).resize(size).toBuffer();
                    }

                    image = await imagemin.buffer(image, {
                        plugins: [
                            imageminJpegtran(),
                            imageminPngquant({quality: [0.8, 0.9]})
                        ]
                    });

                    fs.ensureFileSync(filePath);
                    fs.writeFileSync(filePath, image);

                    return image;

                }

            }
        },
        static: {
            rest: 'GET /images/(.*)',
            cache: cache,
            async handler(ctx) {
                const file = ctx.params[0];
                const key = `images/${file}`;
                const filePath = `${os.tmpdir()}/content/images/${file}`;
                fs.ensureDirSync(path.dirname(filePath));
                const obj = await ctx.call('storage.get', {key, filePath}).catch(() => {
                    throw new MoleculerServerError('Image not found', 404);
                });
                return obj.Body;
            }
        },
        code: {
            rest: 'GET /code/:code',
            cache: cache,
            async handler(ctx) {
                const code = _.replace(ctx.params.code, '.svg', '');
                return qrImage.imageSync(code, {type: 'svg'});
            }
        },
        maps: {
            rest: 'GET /maps/:x/:y/:z/tile.png',
            cache: cache,
            async handler(ctx) {
                const lang = ctx.meta.getLocale();
                const imageResponce = await urllib.request(`https://mt0.google.com/vt/lyrs=m&hl=${lang}&x=${ctx.params.x}&y=${ctx.params.y}&z=${ctx.params.z}&s=Ga`);
                if (imageResponce.status !== 200) {
                    throw new MoleculerServerError('Image not found', 404);
                }
                return imageResponce.data;
            }
        },
        placeholder: {
            rest: 'GET /placeholder/:width/:height/tile.png',
            cache: cache,
            params: {
                width: {
                    type: 'number',
                    convert: true,
                    min: 40,
                    max: 1920,
                },
                height: {
                    type: 'number',
                    convert: true,
                    min: 20,
                    max: 1920,
                },
            },
            async handler(ctx) {
                const width = ctx.params.width;
                const height = ctx.params.height;
                const message = `${width}x${height}`;
                const overlay = `<svg width="${width}" height="${height}">
                                    <text x="50%" y="${height / 2 + 3}" font-family="sans-serif" font-size="10" text-anchor="middle">${message}</text>
                                  </svg>`;
                return await sharp({
                    create: {
                        width: width,
                        height: height,
                        channels: 4,
                        background: {r: 230, g: 230, b: 230, alpha: 1}
                    }
                }).composite([{
                    input: Buffer.from(overlay),
                    gravity: 'center',
                }]).png().toBuffer();
            }
        },
    },
    methods: {
        decodeBase64Image(dataString) {
            let matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/), response = {};
            if (matches === null || matches.length !== 3) {
                return new Error('Invalid input string');
            }
            response.type = matches[1];
            response.data = Buffer.from(matches[2], 'base64');
            return response;
        },
    }
};
