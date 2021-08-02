const _ = require('lodash');
const urllib = require('urllib');
const {isTest} = require('../helpers/test');
const {MoleculerServerError} = require('moleculer').Errors;

exports.card = async (params) => {

    const data = {
        userName: params.userName,
        password: params.password,
        orderNumber: params.paymentid,
        amount: `${params.amount}00`,
        returnUrl: `${params.url}v1/customer/pay/success/${params.paymentid}`,
        failUrl: `${params.url}v1/customer/pay/fail/${params.paymentid}`,
        // description: `Оплата заказа №${params.paymentid}`,
    };

    const responce = await urllib.request(isTest() ? 'https://web.rbsuat.com/ab/rest/register.do' : 'https://pay.alfabank.ru/payment/rest/register.do', {
        method: 'POST',
        dataType: 'json',
        timeout: 60000,
        data: data,
    });

    if (_.get(responce.data, 'errorMessage')) {
        throw new MoleculerServerError(_.get(responce.data, 'errorMessage'));
    }

    return {
        id: _.get(responce.data, 'orderId'),
        url: _.get(responce.data, 'formUrl'),
    };

}

exports.apple = async (params) => {

    console.log(params);

    const buff = Buffer.from(params.token, 'utf-8');
    const base64 = buff.toString('base64');

    const responce = await urllib.request('https://pay.alfabank.ru/payment/applepay/payment.do', {
        method: 'POST',
        contentType: 'json',
        dataType: 'json',
        timeout: 60000,
        data: {
            merchant: params.gatewayMerchantId,
            orderNumber: params.paymentid,
            paymentToken: base64,
        }
    });

    // console.log(responce.data);

    if (_.get(responce.data, 'success') !== true) {
        const err = _.get(responce.data, 'orderStatus.actionCodeDescription', 'Error');
        console.log(err);
        throw new MoleculerServerError(err);
    }

    return responce.data;

}

exports.google = async (params) => {

    console.log(params);

    const buff = Buffer.from(params.token, 'utf-8');
    const base64 = buff.toString('base64');

    const responce = await urllib.request('https://pay.alfabank.ru/payment/google/payment.do', {
        method: 'POST',
        contentType: 'json',
        dataType: 'json',
        timeout: 60000,
        data: {
            merchant: params.gatewayMerchantId,
            orderNumber: params.paymentid,
            paymentToken: base64,
            amount: params.amount + '00',
            ip: params.ip,
            returnUrl: `${params.url}v1/customer/pay/success/${params.paymentid}`,
            failUrl: `${params.url}v1/customer/pay/fail/${params.paymentid}`,
        }
    });

    console.log(responce.data);

    // { success: false, error: { code: '10', description: 'Расшифровка переданных данных неуспешна', message: 'Расшифровка переданных данных неуспешна' } }

    if (_.get(responce.data, 'success') !== true) {
        const err = _.get(responce.data, 'error.description', 'Error');
        console.log(err);
        throw new MoleculerServerError(err);
    }

    return responce.data;

}
