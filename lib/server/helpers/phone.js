exports.clearPhone = (value) => {
    if (!value) return '';
    value = value.replace(/[^0-9\.]+/g, '');
    let first = value.substr(0, 1);
    if (first === '8') {
        value = '7' + value.substr(1);
    }
    return value;
}

exports.formatPhone = (value) => {
    if (!value) return '';
    let first = value.substr(0, 1);
    if (first === '7' && value.length === 11) {
        value = '+' + value.replace(/(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 ($2) $3-$4-$5');
    }
    return value;
}

exports.maskPhone = (value) => {
    if (!value) return '';
    let first = value.substr(0, 1);
    if (first === '7' && value.length === 11) {
        value = '+' + value.replace(/(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 (***) ***-$4-$5');
    }
    return value;
}
