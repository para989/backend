const _ = require('lodash');
const SxGeo = class {
    constructor(file_name) {
        this.file_name = file_name;
        this._load_file_to_buffer();
        this._read_header();
    };
    _load_file_to_buffer() {
        let fs = require('fs-extra');
        let fd = fs.openSync(this.file_name, "r");
        const stats = fs.statSync(this.file_name);
        this.file_buffer = Buffer.alloc(stats.size);
        fs.readSync(fd, this.file_buffer, 0, this.file_buffer.length, 0);
        fs.closeSync(fd);
    };
    _read_header() {
        var buff = Buffer.alloc(40);
        this.file_buffer.copy(buff, 0, 0, buff.length);
        if (buff.toString('utf8', 0, 3) !== "SxG") {
            throw ("it is not SxGeo file");
        } else {
            this.ver = buff.readUInt8(3);
            this.time = buff.readUInt32BE(4);
            this.type = buff.readUInt8(8);
            this.charset = buff.readUInt8(9);
            this.first_byte_index_count = buff.readUInt8(10);
            this.main_index_count = buff.readUInt16BE(11);
            this.blocks_per_index_element = buff.readUInt16BE(13);
            this.range_count = buff.readUInt32BE(15);
            this.block_id_size = buff.readUInt8(19);
            this.block_len = 3 + this.block_id_size;
            this.region_max_size = buff.readUInt16BE(20);
            this.city_max_size = buff.readUInt16BE(22);
            this.regions_size = buff.readUInt32BE(24);
            this.cities_size = buff.readUInt32BE(28);
            this.country_max_size = buff.readUInt16BE(32);
            this.countries_size = buff.readUInt32BE(34);
            this.pack_format_size = buff.readUInt16BE(38);
            this.first_byte_index_offset = 40 + this.pack_format_size;
            this.db_begin = 40 + this.pack_format_size + this.first_byte_index_count * 4 + this.main_index_count * 4;
            this.main_index_offset = this.first_byte_index_offset + 4 * this.first_byte_index_count;
            this.ranges_offset = this.main_index_offset + 4 * this.main_index_count;
            this.regions_offset = this.ranges_offset + this.range_count * (3 + this.block_id_size);
            this.cities_offset = this.regions_offset + this.regions_size;
            var buff = Buffer.alloc(this.pack_format_size + this.first_byte_index_count * 4 + this.main_index_count * 4);
            this.file_buffer.copy(buff, 0, 40, 40 + buff.length);
            var buff_pos = 0;
            this.format_descriptions = buff.toString('utf8', buff_pos, this.pack_format_size);
            let descriptions = this.format_descriptions.split(String.fromCharCode(0));
            this.country_description = descriptions[0];
            this.region_description = descriptions[1];
            this.city_description = descriptions[2];
            buff_pos = this.pack_format_size;
            this.b_idx_arr = []
            for (let i = 0; i < this.first_byte_index_count; i++) {
                this.b_idx_arr[i] = buff.readUInt32BE(buff_pos);
                buff_pos += 4;
            }
            this.m_idx_arr = [];
            for (var i = 0; i < this.main_index_count; i++) {
                this.m_idx_arr[i] = buff.readUInt32BE(buff_pos);
                buff_pos += 4;
            }
        }
    };
    _search_idx(ipn, min, max) {
        while (max - min > 8) {
            var offset = (min + max) >> 1;
            if (ipn > this.m_idx_arr[offset]) {
                min = offset;
            } else {
                max = offset;
            }
        }
        while (ipn > this.m_idx_arr[min] && min++ < max) {
        }
        return min;
    };
    _get_range_ip(block_offset, offset) {
        let position = this.ranges_offset + block_offset + offset * (3 + this.block_id_size);
        let buff = Buffer.alloc(3);
        this.file_buffer.copy(buff, 0, position, position + buff.length);
        let s1 = buff.readUInt8(0) << 16, s2 = buff.readUInt8(1) << 8, s3 = buff.readUInt8(2);
        return s1 + s2 + s3;
    };
    _get_id(block_offset, offset) {
        let position = this.ranges_offset + block_offset + offset * (3 + this.block_id_size) - this.block_id_size;
        let buff = Buffer.alloc(3);
        this.file_buffer.copy(buff, 0, position, position + buff.length);
        let s1 = buff.readUInt8(0) << 16, s2 = buff.readUInt8(1) << 8, s3 = buff.readUInt8(2);
        return s1 + s2 + s3;
    };
    _search_db(block_offset, ipn, min, max) {
        let ipn_buf = new Buffer(4);
        let offset, range_ip, less;
        ipn_buf.writeUInt32BE(ipn, 0);
        ipn_buf.writeUInt8(0, 0)
        ipn = ipn_buf.readUInt32BE(0);
        if (max - min > 1) {
            while (max - min > 8) {
                offset = (min + max) >> 1;
                if (ipn >= this._get_range_ip(block_offset, offset)) {
                    min = offset;
                } else {
                    max = offset;
                }
            }
            range_ip = this._get_range_ip(block_offset, min);
            if (ipn >= range_ip) {
                min++;
                less = (min < max);
            }
            while (ipn >= range_ip && less) {
                range_ip = this._get_range_ip(block_offset, min);
                if (ipn >= range_ip) {
                    min++;
                    less = (min < max);
                }
            }
        } else {
            min++;
        }
        return this._get_id(block_offset, min);
    };
    _get_num(ip) {
        var ip1n = ip.slice(0, ip.indexOf('.'));
        var ipn = this._ip2long(ip);
        if (ip1n === 0 || ip1n === 10 || ip1n === 127 || ip1n >= this.first_byte_index_count || ipn === false) {
            return false;
        }
        var blocks = {
            min: this.b_idx_arr[ip1n - 1],
            max: this.b_idx_arr[ip1n]
        };
        var min, max;
        if (blocks.max - blocks.min > this.blocks_per_index_element) {
            var part = this._search_idx(ipn, Math.floor(blocks.min / this.blocks_per_index_element), Math.floor(blocks.max / this.blocks_per_index_element) - 1);
            if (part > 0) {
                min = part * this.blocks_per_index_element
            } else {
                min = 0;
            }
            if (part > this.main_index_count) {
                max = this.range_count;
            } else {
                max = (part + 1) * this.blocks_per_index_element;
            }
            if (min < blocks.min) {
                min = blocks.min;
            }
            if (max > blocks.max) {
                max = blocks.max;
            }
        } else {
            max = blocks.max;
            min = blocks.min;
        }
        var len = max - min;
        return this._search_db(min * (3 + this.block_id_size), ipn, 0, len);
    };
    _ip2long(IP) {
        var i = 0;
        IP = IP.match(/^([1-9]\d*|0[0-7]*|0x[\da-f]+)(?:\.([1-9]\d*|0[0-7]*|0x[\da-f]+))?(?:\.([1-9]\d*|0[0-7]*|0x[\da-f]+))?(?:\.([1-9]\d*|0[0-7]*|0x[\da-f]+))?$/i);
        if (!IP) {
            return false; // Invalid format.
        }
        IP[0] = 0;
        for (i = 1; i < 5; i += 1) {
            IP[0] += !!((IP[i] || '').length);
            IP[i] = parseInt(IP[i]) || 0;
        }
        IP.push(256, 256, 256, 256);
        IP[4 + IP[0]] *= Math.pow(256, 4 - IP[0]);
        if (IP[1] >= IP[5] || IP[2] >= IP[6] || IP[3] >= IP[7] || IP[4] >= IP[8]) {
            return false;
        }
        return IP[1] * (IP[0] === 1 || 16777216) + IP[2] * (IP[0] <= 2 || 65536) + IP[3] * (IP[0] <= 3 || 256) + IP[4] * 1;
    };
    _read_country(seek) {
        let position = this.cities_offset + seek;
        let buff = Buffer.alloc(this.country_max_size);
        this.file_buffer.copy(buff, 0, position, position + buff.length);
        return buff;
    };
    _read_region(seek) {
        let position = this.regions_offset + seek;
        let buff = Buffer.alloc(this.region_max_size);
        this.file_buffer.copy(buff, 0, position, position + buff.length);
        return buff;
    };
    _read_city(seek) {
        let position = this.cities_offset + seek;
        let buff = Buffer.alloc(this.city_max_size);
        this.file_buffer.copy(buff, 0, position, position + buff.length);
        return buff;
    };
    _from_utf8_array(data) {
        var str = '', i;
        for (i = 0; i < data.length; i++) {
            var value = data[i];
            if (value < 0x80) {
                str += String.fromCharCode(value);
            } else if (value > 0xBF && value < 0xE0) {
                str += String.fromCharCode((value & 0x1F) << 6 | data[i + 1] & 0x3F);
                i += 1;
            } else if (value > 0xDF && value < 0xF0) {
                str += String.fromCharCode((value & 0x0F) << 12 | (data[i + 1] & 0x3F) << 6 | data[i + 2] & 0x3F);
                i += 2;
            } else {
                var charCode = ((value & 0x07) << 18 | (data[i + 1] & 0x3F) << 12 | (data[i + 2] & 0x3F) << 6 | data[i + 3] & 0x3F) - 0x010000;
                str += String.fromCharCode(charCode >> 10 | 0xD800, charCode & 0x03FF | 0xDC00);
                i += 3;
            }
        }
        return str;
    };
    _unpack(buff, description) {
        let fields = _.split(description, '/');
        let sz, field, offset = 0, name, kind, result = {};
        _.each(fields, item => {
            field = _.split(item, ':');
            kind = field[0];
            name = field[1];
            switch (kind) {
                case 't':
                    sz = 1;
                    result[name] = buff.readUInt8(offset) - 128;
                    break;
                case 'T':
                    sz = 1;
                    result[name] = buff.readUInt8(offset);
                    break;
                case 's':
                    sz = 2;
                    result[name] = buff.readInt16(offset);
                    break;
                case 'S':
                    sz = 2;
                    result[name] = buff.readUInt16LE(offset);
                    break;
                case 'm':
                    sz = 3;
                    result[name] = buff.readUInt8(offset) + (buff.readUInt8(offset + 1) << 8) + (buff.readUInt8(offset + 2) << 16) - 8388608;
                    break;
                case 'M':
                    sz = 3;
                    result[name] = buff.readUInt8(offset) + (buff.readUInt8(offset + 1) << 8) + (buff.readUInt8(offset + 2) << 16);
                    break;
                case 'd':
                    sz = 8;
                    result[name] = buff.readFloat(offset);
                    break;
                case 'b':
                    sz = 0;
                    let str = [];
                    let byte = 255;
                    while (byte > 0) {
                        byte = buff.readUInt8(offset + sz);
                        if (byte > 0) {
                            str.push(byte);
                        }
                        sz++;
                    }
                    result[name] = this._from_utf8_array(str);
                    break;
                default:
                    if (kind.indexOf('n') === 0) {
                        sz = 2;
                    } else if (kind.indexOf('N') === 0) {
                        sz = 4;
                    } else if (kind.indexOf('c') === 0) {
                        sz = parseInt(kind.split('c')[1]);
                        let str = [];
                        for (var index = 0; index < sz; index++) {
                            str.push(buff.readUInt8(offset + index));
                        }
                        result[name] = this._from_utf8_array(str);
                    } else {
                        sz = 4;
                    }
                    break;
            }
            offset += sz;
        });
        return result;
    };
    get(ip) {
        let num = this._get_num(ip);
        if (num > 0) {
            let result = {}, city, region, country;
            if (num < this.countries_size) {
                country = this._unpack(this._read_country(num), this.country_description);
            } else {
                city = this._unpack(this._read_city(num), this.city_description);
            }
            if (city) {
                if (city.region_seek) {
                    region = this._unpack(this._read_region(city.region_seek), this.region_description);
                    delete (city.region_seek);
                } else if (city.region_seek === 0) {
                    delete (city.region_seek);
                }
            }

            if (region) {
                if (region.country_seek) {
                    country = this._unpack(this._read_country(region.country_seek), this.country_description);
                    delete (region.country_seek);
                } else if (region.country_seek === 0) {
                    delete (region.country_seek);
                }
            }

            if (country) {
                result.country = country;
            }
            if (region) {
                result.region = region;
            }
            if (city) {
                if (city.country_id || city.country_id === 0) {
                    delete city.country_id;
                }
                result.city = city;
            }
            return result;
        }
    }
};
module.exports = SxGeo;
