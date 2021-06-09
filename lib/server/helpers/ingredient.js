exports.ingredientCard = (data) => {
    return {
        id: data._id.toString(),
        name: data.name,
        allergen: data.allergen,
    };
}
