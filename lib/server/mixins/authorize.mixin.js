const _ = require('lodash');
const {MoleculerServerError} = require('moleculer').Errors;

module.exports = {
    methods: {
        hasAccess(ctx) {
            const permits = _.get(ctx.meta, 'user.permits');
            const role = _.split(ctx.action.role, ':');
            if (_.size(role) === 2) {
                if (_.isUndefined(permits)) {
                    throw new MoleculerServerError(ctx.meta.__('unauthorized'), 401);
                }
                const permit = role[0]; // orders, places, checklists, showcase, marketing, users, reports, settings
                const type = role[1];
                switch (type) {
                    case 'read':
                        if (!_.includes([/*'not', */'read', 'write'], permits[permit])) {
                            this.notAccess(ctx);
                        }
                        break;
                    case 'write':
                        if (permits[permit] !== 'write') {
                            this.notAccess(ctx);
                        }
                        break;
                    default:
                        this.notAccess(ctx);
                        break;
                }
            }
        },
        notAccess(ctx) {
            throw new MoleculerServerError(ctx.meta.__('no-access'), 403);
        },
    }
}
