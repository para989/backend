module.exports = {
    actions: {
        findOne: {
            handler(ctx) {
                const params = ctx.params;
                return this.adapter.model.findOne(params.query, params.fields, params.options);
            }
        },
        findOneAndUpdate: {
            handler(ctx) {
                const params = ctx.params;
                return this.adapter.model.findOneAndUpdate(params.query, params.update, params.options);
            }
        },
        insertMany: {
            handler(ctx) {
                const params = ctx.params;
                return this.adapter.model.insertMany(params.docs, params.options);
            }
        },
        updateOne: {
            handler(ctx) {
                const params = ctx.params;
                return this.adapter.model.updateOne(params.filter, params.doc, params.options);
            }
        },
        updateMany: {
            handler(ctx) {
                const params = ctx.params;
                return this.adapter.model.updateMany(params.filter, params.doc, params.options);
            }
        },
        deleteOne: {
            handler(ctx) {
                const params = ctx.params;
                return this.adapter.model.deleteOne(params.query, params.options);
            }
        },
        deleteMany: {
            handler(ctx) {
                const params = ctx.params;
                return this.adapter.model.deleteMany(params.query, params.options);
            }
        },
        bulkWrite: {
            handler(ctx) {
                const params = ctx.params;
                return this.adapter.model.bulkWrite(params.ops);
            }
        },
        countDocuments: {
            handler(ctx) {
                const params = ctx.params;
                return this.adapter.model.countDocuments(params.query);
            }
        },
    },
};
