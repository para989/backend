exports.paymentMethodCard = (data) => {
    let params;
    const type = data.type;
    if (data.params && (type === 'apple' || type === 'google')) {
        params = data.params;
    }
    return {
        id: data._id.toString(),
        type,
        name: data.name,
        params,
    };
}
