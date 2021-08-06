const _ = require('lodash');
const fs = require('fs-extra');
const sass = require('sass');
const os = require('os');
const path = require('path');
const cssDir = path.join(os.tmpdir(), 'css');
const csso = require('csso');
const {isTest} = require('../helpers/test');
const cache = !isTest();

const Queue = require('bull');
const generateCSSQueue = new Queue('generate-css', {redis: global.REDIS});

module.exports = {
    name: 'css',
    version: 1,
    settings: {
        rest: '/css',
    },
    dependencies: [
        'v1.config',
    ],
    events: {
        'css:updated': {
            async handler(ctx) {
                generateCSSQueue.add({type: 'main'}, {removeOnComplete: true});
                generateCSSQueue.add({type: 'leaflet'}, {removeOnComplete: true});
            }
        },
    },
    async created() {
        fs.ensureDirSync(cssDir);
    },
    async started() {
        await this.broker.waitForServices(['v1.config']);
        generateCSSQueue.process(this.generate);
        generateCSSQueue.add({type: 'main'}, {removeOnComplete: true});
        generateCSSQueue.add({type: 'leaflet'}, {removeOnComplete: true});
    },
    actions: {
        main: {
            rest: 'GET /main.min.css',
            cache,
            async handler(ctx) {
                if (isTest()) {
                    ctx.meta.$responseHeaders = {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                    };
                }
                return await this.read('main');
            }
        },
        leaflet: {
            rest: 'GET /leaflet.min.css',
            cache,
            async handler(ctx) {
                if (isTest()) {
                    ctx.meta.$responseHeaders = {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                    };
                }
                return await this.read('leaflet');
            }
        },
    },
    methods: {
        file(type) {
            return path.join(cssDir, `${type}.min.css`);
        },
        async read(type) {
            if (!fs.existsSync(this.file(type))) {
                generateCSSQueue.add({type}, {removeOnComplete: true});
            }
            return fs.readFileSync(this.file(type), 'utf-8');
        },
        async generate(job, done) {

            const type = job.data.type;

            const dir = `${__dirname}/../scss`;

            let data = '';

            if (type === 'main') {
                const colors = _.get(this.broker.metadata, 'colors', {});
                _.each(colors, (color, key) => {
                    data += `\n$${_.kebabCase(key)}: ${color};`;
                });
            }

            data += fs.readFileSync(`${dir}/${type}.scss`, 'utf8');

            const scss = sass.renderSync({data, includePaths: [dir]});

            let css = scss.css.toString();

            if (isTest()) {
                fs.writeFileSync(this.file(type), css);
            } else {
                const ast = csso.syntax.parse(css);
                const compressedAst = csso.syntax.compress(ast, {comments: false}).ast;
                fs.writeFileSync(this.file(type), csso.syntax.generate(compressedAst));
            }

            await this.broker.cacher.clean(`v1.css.${type}**`);

            done();

        },
    }
};
