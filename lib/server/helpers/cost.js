const _ = require('lodash');
const numbro = require('numbro');

exports.cost = (amount) => {
    const str = numbro(amount).format({
        trimMantissa: global.LANG === 'ru',
        mantissa: 2,
    });
    return global.LANG === 'ru' ? `${str} ₽` : `$ ${str}`;
}
