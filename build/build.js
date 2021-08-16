const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const shelljs = require('shelljs');
const semver = require('semver');
const {Confirm} = require('enquirer'); // https://www.npmjs.com/package/enquirer

async function build() {

    const dir = path.join(__dirname, '..');

    const buildOffice = await new Confirm({
        name: 'build-office',
        message: 'Would you like to build Office?'
    }).run().catch(() => {
        return null;
    });

    const buildSite = await new Confirm({
        name: 'build-site',
        message: 'Would you like to build Site?'
    }).run().catch(() => {
        return null;
    });

    if (buildOffice) {
        shelljs.cd(path.join(dir, '..', 'office'));
        shelljs.exec('npm run build');

    }

    if (buildSite) {
        shelljs.cd(path.join(dir, '..', 'site'));
        shelljs.exec('npm run build');
    }

    shelljs.cd(dir);

    const packageJson = path.join(dir, 'package.json');
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

build();
