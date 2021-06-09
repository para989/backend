exports.agreementCard = (data) => {
    return {
        id: data._id.toString(),
        name: data.name,
    };
}
