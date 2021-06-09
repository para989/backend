const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const shelljs = require('shelljs');
const semver = require('semver');


async function deploy() {

    const packageJson = path.join(__dirname, 'package.json');
    const config = fs.readJsonSync(packageJson);

    const version = semver.inc(config.version, 'patch');
    config.version = version;
    fs.writeJsonSync(packageJson, config, {spaces: '\t'});

    console.log(`Current version: ${version}`);
    
    shelljs.exec('git add .');
    shelljs.exec(`git commit -am  "${version}" && git push -u origin main`);
    shelljs.exec(`npm publish --access public`);

    console.log('Published successfully.');

}

deploy();
