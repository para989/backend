const {convertHtmlToDelta, convertDeltaToHtml} = require('@xiphe/node-quill-converter');
const {QuillDeltaToHtmlConverter} = require('quill-delta-to-html');

// Delta.toBrowser
exports.toBrowser = (html) => {
    if (!html) {
        return;
    }
    const converter = new QuillDeltaToHtmlConverter(convertHtmlToDelta(html).ops);
    return converter.convert();
};

// Delta.toEditor
exports.toEditor = (html) => {
    if (!html) {
        return;
    }
    return convertDeltaToHtml(convertHtmlToDelta(html));
};
