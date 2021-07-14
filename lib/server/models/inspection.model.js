const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InspectionSchema = new Schema({
    checklist: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Checklist',
        required: true,
    },
    place: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Place',
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    values: {
        type: Schema.Types.Mixed,
        required: true,
    },
    violations: {
        type: Schema.Types.Number,
        default: 0,
    },
    description: mongoose.Schema.Types.String,
}, {
    collection: 'inspections',
    timestamps: {createdAt: 'created', updatedAt: 'updated'},
    versionKey: false
});

InspectionSchema.index({'checklist': 1});
InspectionSchema.index({'place': 1});
InspectionSchema.index({'created': 1});

module.exports = mongoose.model('Inspection', InspectionSchema);
