const _ = require('lodash');
const numbro = require('numbro');

exports.cost = (amount, lang) => {
    let str = numbro(amount).format({
        trimMantissa: true,
        mantissa: 2,
    });
    return `${str} ₽`;
}
