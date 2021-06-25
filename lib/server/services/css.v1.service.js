const _ = require('lodash');
const fs = require('fs-extra');
const sass = require('sass');
const os = require('os');
const path = require('path');
const cssDir = path.join(os.tmpdir(), 'css');
const csso = require('csso');
const {isTest} = require('../helpers/test');
const cache = !isTest();

module.exports = {
    name: 'css',
    version: 1,
    settings: {
        rest: '/css',
    },
    events: {
        'css:updated': {
            async handler(ctx) {
                this.generate('main');
            }
        },
    },
    async started() {
        fs.ensureDirSync(cssDir);
        await this.broker.waitForServices(['v1.config']);
        this.generate('main');
        this.generate('leaflet');
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
                return this.read('main');
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
                return this.read('leaflet');
            }
        },
    },
    methods: {
        file(type) {
            return path.join(cssDir, `${type}.min.css`);
        },
        read(type) {
            return fs.readFileSync(this.file(type), 'utf-8');
        },
        generate(type) {

            const dir = `${__dirname}/../scss`;

            const colors = _.get(this.broker.metadata, 'colors', {});

            let data = '';
            _.each(colors, (color, key) => {
                data += `\n$${_.kebabCase(key)}: ${color};`;
            });

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

            this.broker.cacher.clean(`v1.css.${type}**`);

        },
    }
};
