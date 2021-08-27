const extractor = require('keyword-extractor');
const Morphy = require('phpmorphy');
const _ = require('lodash');

exports.morphy = (string) => {

    let words = extractor.extract(string, {
        language: global.LANG === 'ru' ? 'russian' : 'english',
        remove_digits: true,
        return_changed_case: true,
        remove_duplicates: true
    });

    const morphy = new Morphy(global.LANG, {
        storage: Morphy.STORAGE_MEM,
        predict_by_suffix: true,
        predict_by_db: true,
        graminfo_as_text: true,
        use_ancodes_cache: false,
        resolve_ancodes: Morphy.RESOLVE_ANCODES_AS_TEXT
    });

    const parts = morphy.getPartOfSpeech(words, Morphy.NORMAL);

    if (_.size(parts) === 0) {
        return false;
    }

    words = [];

    for (let key in parts) {
        let arr = parts[key];
        if (typeof arr === 'object') {
            if (arr.includes('ПРЕДЛ') || arr.includes('СОЮЗ') || arr.includes('МЕЖД') || arr.includes('ЧАСТ') || arr.includes('ВВОДН') || arr.includes('ФРАЗ')) {
                continue;
            }
            words.push(key);
        }
    }

    if (words.length === 0) {
        return false;
    }

    const forms = morphy.getAllForms(words, Morphy.NORMAL);

    words = [];

    for (let key in forms) {
        let arr = forms[key];
        words.push(_.join(arr, ' '));
    }

    string = _.toLower(_.join(words, ' '));

    return string;

}
