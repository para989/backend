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
    };

    const res = await urllib.request(isTest() ? 'https://web.rbsuat.com/ab/rest/register.do' : 'https://pay.alfabank.ru/payment/rest/register.do', {
        method: 'POST',
        dataType: 'json',
        timeout: 60000,
        data: data,
    });

    const response = res.data;

    const result = {response};

    const error = _.get(response, 'errorMessage');

    if (error) {
        result.success = false;
        result.error = error;
    } else {
        result.id = _.get(response, 'orderId');
        result.url = _.get(response, 'formUrl');
    }

    return result;

}

exports.apple = async (params) => {

    console.log(params);

    const buff = Buffer.from(params.token, 'utf-8');
    const base64 = buff.toString('base64');

    const res = await urllib.request('https://pay.alfabank.ru/payment/applepay/payment.do', {
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

    const response = res.data;

    const result = {response};

    console.log(response);

    const success = _.get(response, 'success');

    if (success === true) {
        result.success = true;
    } else {
        result.success = false;
        result.error = _.get(response, 'orderStatus.actionCodeDescription', 'Error');
    }

    return result;

}

exports.google = async (params) => {

    console.log(params);

    const buff = Buffer.from(params.token, 'utf-8');
    const base64 = buff.toString('base64');

    const res = await urllib.request('https://pay.alfabank.ru/payment/google/payment.do', {
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

    const response = res.data;

    const result = {response};

    console.log(response);

    // { success: false, error: { code: '10', description: 'Расшифровка переданных данных неуспешна', message: 'Расшифровка переданных данных неуспешна' } }

    const success = _.get(response, 'success');

    if (success === true) {
        const url = _.get(response, 'data.acsUrl');
        if (_.get(response, 'data.acsUrl')) {
            result.url = url;
        } else {
            result.success = true;
        }
    } else {
        result.success = false;
        result.error = _.get(response, 'error.description', 'Error');
    }

    return result;

}
