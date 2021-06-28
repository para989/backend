const _ = require('lodash');
const {format} = require('date-fns');
const {formatPhone} = require('./phone');

function orderNumber(number, date) {
    if (!date) {
        date = new Date();
    }
    return `${number}-${format(date, 'MM')}`;
}

function orderItemNumber(number, date, index) {
    return `${orderNumber(number, date)}-${index + 1}`;
}

function orderCard(order) {
    const address = [];
    if (order.postalcode) {
        address.push(order.postalcode);
    }
    if (order.country) {
        address.push(order.country);
    }
    if (order.city) {
        address.push(order.city);
    }
    if (order.address) {
        address.push(order.address);
    }
    /*if (order.desiredTime) {
        let cityDate = moment(order.desiredTime).tz(order.city.timeZoneId);
        if (cityDate) {
            result.desiredTime = order.desiredTime ? cityDate.format(order.country.dateFormat) + ' ' + cityDate.format(order.country.timeFormat === 12 ? 'hh:mm A' : 'HH:mm') : '';
        }
    }
    if (!result.name) result.name = i18n.__('buyer');
    if (result.date) result.date = new Date(result.date);*/

    const result = {
        orderid: order._id.toString(),
        placeid: order.place.toString(),
        index: order.index || 0,
        name: order.name,
        phone: order.phone ? formatPhone(order.phone) : '-',
        address: _.join(address, ', '),
        amount: order.amount,
        discount: order.discount || 0,
        number: orderNumber(order.number, order.date),
        status: order.status,
        progress: order.progress,
        date: order.date,
        obtaining: order.obtaining,
        items: order.items,
        wishes: order.wishes,
        // user: order.user,
        // paymentMethod: order.paymentMethod,
    };
    return JSON.parse(JSON.stringify(result));
}

exports.orderNumber = orderNumber;
exports.orderItemNumber = orderItemNumber;
exports.orderCard = orderCard;
