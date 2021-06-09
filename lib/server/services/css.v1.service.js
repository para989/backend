const _ = require('lodash');
const fs = require('fs-extra');
const sass = require('sass');
const os = require('os');
const path = require('path');
const cssDir = path.join(os.tmpdir(), 'css');
const cssFile = path.join(cssDir, 'main.min.css');
//const sassVars = require('json-sass-vars');
const csso = require('csso');
const {isTest} = require("../helpers/test");
const cache = !isTest();

module.exports = {
    name: 'css',
    version: 1,
    settings: {
        rest: '/css',
    },
    async started() {
        fs.ensureDirSync(cssDir);
        // await this.generate();
    },
    actions: {
        main: {
            rest: 'GET /main.min.css',
            cache,
            async handler(ctx) {
                if (isTest()) {
                    ctx.meta.$responseHeaders = {
                        'Cache-Control': 'no-cache, no-store, must-revalidate'
                    };
                }
                return fs.readFileSync(cssFile, 'utf-8');
            }
        },
    },
    methods: {
        async generate() {

            const dir = `${__dirname}/../scss`;

            let theme = '';
            theme += `\n$primary: #FF6000;`;
            theme += `\n$dark: #271811;`;
            theme += `\n$product-price-color: #BCA79D;`;
            theme += fs.readFileSync(`${dir}/theme.scss`, 'utf8');

            const scss = sass.renderSync({data: theme, includePaths: [dir]});

            let css = scss.css.toString();

            if (isTest()) {
                fs.writeFileSync(cssFile, css);
            } else {
                const ast = csso.syntax.parse(css);
                const compressedAst = csso.syntax.compress(ast, {comments: false}).ast;
                fs.writeFileSync(cssFile, csso.syntax.generate(compressedAst));
            }

        },
    }
};
