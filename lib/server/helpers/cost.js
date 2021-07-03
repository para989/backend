const _ = require('lodash');
const numbro = require('numbro');

exports.cost = (amount) => {
    const str = numbro(amount).format({
        trimMantissa: global.CURRENCY === 'rub',
        mantissa: 2,
    });
    return global.CURRENCY === 'rub' ? `${str} ₽` : `$ ${str}`;
}
