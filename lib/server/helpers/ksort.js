exports.ksort = (inputArr, sort_flags) => {
    let tmp_arr = {},
        keys = [],
        sorter, i, k, that = this,
        strictForIn = false,
        populateArr = {};

    switch (sort_flags) {
        case 'SORT_STRING':
            sorter = function (a, b) {
                return that.strnatcmp(a, b);
            };
            break;
        case 'SORT_LOCALE_STRING':
            let loc = this.i18n_loc_get_default();
            sorter = this.php_js.i18nLocales[loc].sorting;
            break;
        case 'SORT_NUMERIC':
            sorter = function (a, b) {
                return ((a + 0) - (b + 0));
            };
            break;
        default:
            sorter = function (a, b) {
                let aFloat = parseFloat(a),
                    bFloat = parseFloat(b),
                    aNumeric = aFloat + '' === a,
                    bNumeric = bFloat + '' === b;
                if (aNumeric && bNumeric) {
                    return aFloat > bFloat ? 1 : aFloat < bFloat ? -1 : 0;
                } else if (aNumeric && !bNumeric) {
                    return 1;
                } else if (!aNumeric && bNumeric) {
                    return -1;
                }
                return a > b ? 1 : a < b ? -1 : 0;
            };
            break;
    }
    for (k in inputArr) {
        if (inputArr.hasOwnProperty(k)) {
            keys.push(k);
        }
    }
    keys.sort(sorter);
    this.php_js = this.php_js || {};
    this.php_js.ini = this.php_js.ini || {};
    strictForIn = this.php_js.ini['phpjs.strictForIn'] && this.php_js.ini['phpjs.strictForIn'].local_value && this.php_js
        .ini['phpjs.strictForIn'].local_value !== 'off';
    populateArr = strictForIn ? inputArr : populateArr;
    for (i = 0; i < keys.length; i++) {
        k = keys[i];
        tmp_arr[k] = inputArr[k];
        if (strictForIn) {
            delete inputArr[k];
        }
    }
    for (i in tmp_arr) {
        if (tmp_arr.hasOwnProperty(i)) {
            populateArr[i] = tmp_arr[i];
        }
    }
    return strictForIn || populateArr;
}