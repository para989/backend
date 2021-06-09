const _ = require('lodash');

module.exports = {
    name: 'colors',
    version: 1,
    actions: {
        get: {
            async handler(ctx) {

                const colors = [];
                colors.push({color: 'red', hex: '#f44336'});
                colors.push({color: 'pink', hex: '#e91e63'});
                colors.push({color: 'purple', hex: '#9c27b0'});
                colors.push({color: 'deeppurple', hex: '#673ab7'});
                colors.push({color: 'indigo', hex: '#3f51b5'});
                colors.push({color: 'blue', hex: '#2196f3'});
                colors.push({color: 'lightblue', hex: '#03a9f4'});
                colors.push({color: 'cyan', hex: '#00bcd4'});
                colors.push({color: 'teal', hex: '#009688'});
                colors.push({color: 'green', hex: '#4caf50'});
                colors.push({color: 'lightgreen', hex: '#8bc34a'});
                colors.push({color: 'lime', hex: '#cddc39'});
                colors.push({color: 'yellow', hex: '#ffeb3b'});
                colors.push({color: 'amber', hex: '#ffc107'});
                colors.push({color: 'orange', hex: '#ff9800'});
                colors.push({color: 'deeporange', hex: '#ff5722'});
                colors.push({color: 'brown', hex: '#795548'});
                colors.push({color: 'gray', hex: '#9e9e9e'});
                colors.push({color: 'bluegray', hex: '#607d8b'});
                colors.push({color: 'black', hex: '#000000'});

                const i18n = this.broker.metadata.i18n;
                i18n.setLocale(ctx.params.language);
                _.each(colors, color => {
                    color.name = i18n.__(color.color);
                });

                return _.sortBy(colors, ['name']);

            },
        },
    }
};
