exports.promotionCard = (data) => {
    return {
        id: data._id.toString(),
        name: data.name,
        description: data.description,
        picture: data.picture,
        banner: data.banner,
    };
}
