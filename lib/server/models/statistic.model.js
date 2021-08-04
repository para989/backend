const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    date: {
        $type: Schema.Types.Date,
        required: true,
    },
    places: {
        $type: {
            purchases: {
                $type: Schema.Types.Number,
                default: 0,
            },
            reviews: {
                $type: Schema.Types.Number,
                default: 0,
            },
        },
    },
    products: {
        $type: {
            purchases: {
                $type: Schema.Types.Number,
                default: 0,
            },
            reviews: {
                $type: Schema.Types.Number,
                default: 0,
            },
        },
    },
    seasons: {
        $type: {
            purchases: {
                $type: Schema.Types.Number,
                default: 0,
            },
            reviews: {
                $type: Schema.Types.Number,
                default: 0,
            },
        },
    },
    orders: {
        $type: {
            total: {
                $type: Schema.Types.Number,
                default: 0,
            },
            revenue: {
                $type: Schema.Types.Number,
                default: 0,
            },
        },
    },
    customers: {
        $type: {
            total: {
                $type: Schema.Types.Number,
                default: 0,
            },
        },
    },
    platforms: {
        $type: {
            ios: {
                $type: Schema.Types.Number,
                default: 0,
            },
            android: {
                $type: Schema.Types.Number,
                default: 0,
            },
            site: {
                $type: Schema.Types.Number,
                default: 0,
            },
        },
    },
}, {
    collection: 'statistics',
    typeKey: '$type',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

schema.index({'date': 1});
schema.set('toJSON', {
    virtuals: true, transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('StatisticSchema', schema);
