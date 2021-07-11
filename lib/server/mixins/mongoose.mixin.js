module.exports = {
    actions: {
        findOne: {
            handler(ctx) {
                return this._findOne(ctx, ctx.params);
            }
        },
        findOneAndUpdate: {
            handler(ctx) {
                return this._findOneAndUpdate(ctx, ctx.params);
            }
        },
        insertMany: {
            handler(ctx) {
                return this._insertMany(ctx, ctx.params);
            }
        },
        updateOne: {
            handler(ctx) {
                return this._updateOne(ctx, ctx.params);
            }
        },
        updateMany: {
            handler(ctx) {
                return this._updateMany(ctx, ctx.params);
            }
        },
        deleteOne: {
            handler(ctx) {
                return this._deleteOne(ctx, ctx.params);
            }
        },
        deleteMany: {
            handler(ctx) {
                return this._deleteMany(ctx, ctx.params);
            }
        },
        bulkWrite: {
            handler(ctx) {
                return this._bulkWrite(ctx, ctx.params);
            }
        },
        countDocuments: {
            handler(ctx) {
                return this._countDocuments(ctx, ctx.params);
            }
        },
    },
    methods: {
        _findOne(ctx, params) {
            return this.adapter.model.findOne(params.conditions, params.projection, params.options);
        },
        _findOneAndUpdate(ctx, params) {
            return this.adapter.model.findOneAndUpdate(params.conditions, params.update, params.options);
        },
        _insertMany(ctx, params) {
            return this.adapter.model.insertMany(params.docs, params.options);
        },
        _updateOne(ctx, params) {
            return this.adapter.model.updateOne(params.filter, params.doc, params.options);
        },
        _updateMany(ctx, params) {
            return this.adapter.model.updateMany(params.filter, params.doc, params.options);
        },
        _deleteOne(ctx, params) {
            return this.adapter.model.deleteOne(params.conditions, params.options);
        },
        _deleteMany(ctx, params) {
            return this.adapter.model.deleteMany(params.conditions, params.options);
        },
        _bulkWrite(ctx, params) {
            return this.adapter.model.bulkWrite(params.ops);
        },
        _countDocuments(ctx, params) {
            return this.adapter.model.countDocuments(params.filter);
        },
    },
};
