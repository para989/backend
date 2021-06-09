const _ = require('lodash');

function toRemove(character, extraMinus) {
    if (extraMinus && character === "-") {
        return true;
    }
    switch (character) {
        case " ":
        case "\t":
        case "\r":
        case "\n":
        case "\f":
            return true;
        default:
            return false;
    }
}

const trim = (str, repeatingBlanks, extraMinus) => {
    if (!str) return '';
    let startIndex = 0;
    while (toRemove(str.charAt(startIndex), extraMinus)) {
        ++startIndex;
    }
    let endIndex = str.length - 1;
    while (toRemove(str.charAt(endIndex), extraMinus)) {
        --endIndex;
    }
    if (endIndex >= startIndex) {
        let result = str.slice(startIndex, endIndex + 1);
        if (repeatingBlanks) {
            result = result.replace(/\s\s+/g, ' ');
        }
        if (extraMinus) {
            result = result.replace(/\-\-+/g, '-');
        }
        return result;
    } else {
        return "";
    }
}

exports.translitIt = (str) => {
    str = trim(_.toLower(str), true, true);
    let syms = {};
    syms["а"] = "a";
    syms["б"] = "b";
    syms["в"] = "v";
    syms["г"] = "g";
    syms["д"] = "d";
    syms["е"] = "e";
    syms["ё"] = "e";
    syms["ж"] = "zh";
    syms["з"] = "z";
    syms["и"] = "i";
    syms["й"] = "y";
    syms["к"] = "k";
    syms["л"] = "l";
    syms["м"] = "m";
    syms["н"] = "n";
    syms["о"] = "o";
    syms["п"] = "p";
    syms["р"] = "r";
    syms["с"] = "s";
    syms["т"] = "t";
    syms["у"] = "u";
    syms["ф"] = "f";
    syms["х"] = "kh";
    syms["ц"] = "ts";
    syms["ч"] = "ch";
    syms["ш"] = "sh";
    syms["щ"] = "sch";
    syms["ъ"] = "y";
    syms["ы"] = "yi";
    syms["ь"] = "";
    syms["э"] = "e";
    syms["ю"] = "yu";
    syms["я"] = "ya";
    syms[" "] = "-";
    let result = "";
    for (let i = 0; i < str.length; i++) {
        let c = str.charCodeAt(i);
        let char = str.substr(i, 1);
        if ((c >= 0x30 && c <= 0x39) || (c >= 0x61 && c <= 0x7a) || c === 0x5f) {
            result += char;
        } else if (syms.hasOwnProperty(char)) {
            result += syms[char];
        }
    }
    return result;
}