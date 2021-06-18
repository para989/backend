module.exports = {
    name: 'balances',
    version: 1,
    actions: {
        amounts: {
            async handler(ctx) {
                let amounts;
                if (global.LANG === 'ru') {
                    amounts = [100, 500, 1000, 2000, 5000];
                } else {
                    amounts = [1, 2, 5, 10, 20, 50, 100];
                }
                return amounts;
            }
        }
    }
};
