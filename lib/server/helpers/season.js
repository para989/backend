exports.seasonCard = (data) => {
    return {
        id: data._id.toString(),
        name: data.name,
        description: data.description,
        picture: data.picture,
        duration: data.duration,
        price: data.price,
        amount: data.amount,
        places: data.places,
        products: data.products,
    };
}
