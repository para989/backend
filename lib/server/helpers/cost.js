const _ = require('lodash');
const numbro = require('numbro');

exports.cost = (amount, lang) => {
    let str = numbro(amount).format({
        trimMantissa: lang === 'ru',
        mantissa: 2,
    });
    return lang === 'ru' ? `${str} ₽` : `$ ${str}`;
}
