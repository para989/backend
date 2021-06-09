const star = (rating, position) => {
    if (rating < 0.5 + position) {
        return 'share-star-empty';
    } else if (rating === 0.5 + position) {
        return 'share-star-half-alt';
    } else if (rating > 0.5 + position) {
        return 'share-star';
    }
};

exports.stars = (rating) => {
    return [star(rating, 0), star(rating, 1), star(rating, 2), star(rating, 3), star(rating, 4)];
}