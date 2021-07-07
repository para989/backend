exports.giftCard = (data) => {
    return {
        id: data._id.toString(),
        products: data.products,
        gifts: data.gifts,
        quantity: data.quantity,
        price: data.price,
        name: data.name,
        description: data.description || '',
        icon: data.icon,
    };
}
