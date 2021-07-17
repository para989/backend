exports.ingredientCard = (data) => {
    return {
        id: data.id || data._id.toString(),
        name: data.name,
        allergen: data.allergen,
    };
}
