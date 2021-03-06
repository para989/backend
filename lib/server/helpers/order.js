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
    const result = {
        orderid: order.id || order._id.toString(),
        placeid: order.place.toString(),
        index: order.index || 0,
        name: order.name,
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
    if (order.desiredTime) {
        result.desiredTime = order.desiredTime;
    }
    if (_.size(address)) {
        result.address = _.join(address, ', ');
    }
    if (order.phone) {
        result.phone = formatPhone(order.phone);
    }
    if (order.email) {
        result.email = order.email;
    }
    return JSON.parse(JSON.stringify(result));
}

exports.orderNumber = orderNumber;
exports.orderItemNumber = orderItemNumber;
exports.orderCard = orderCard;
