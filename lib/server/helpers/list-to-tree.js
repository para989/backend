const _ = require('lodash');

exports.listToTree = (data, options = {}) => {

    let idKey = options.idKey || 'id';
    let parentKey = options.parentKey || 'parent';
    let childrenKey = options.childrenKey || 'children';
    let tree = _.clone(data);

    const getParent = (rootNode, rootId) => {
        for (let i = 0; i < rootNode.length; i++) {
            let item = rootNode[i];
            if (item[idKey] === rootId) {
                return item;
            }
            if (item[childrenKey]) {
                let childGroup = getParent(item[childrenKey], rootId);
                if (childGroup) {
                    return childGroup;
                }
            }
        }
        return null;
    };

    let len = tree.length - 1;
    for (let i = len; i >= 0; i--) {
        let item = _.clone(tree[i]);
        if (item[parentKey]) {
            delete tree.splice(i, 1);
            let parent = getParent(tree, item[parentKey]);
            if (parent) {
                if (parent[childrenKey] === undefined) {
                    parent[childrenKey] = [];
                }
                parent[childrenKey].unshift(item);
            }
        }
    }

    return tree;

}