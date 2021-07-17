exports.agreementCard = (data) => {
    return {
        id: data.id || data._id.toString(),
        name: data.name,
    };
}
