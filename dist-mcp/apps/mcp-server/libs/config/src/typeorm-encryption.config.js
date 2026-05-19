"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeormEncryptionConfig = void 0;
require("dotenv/config");
const crypto_1 = require("crypto");
const typeormEncryptionConfig = (salt = 'localSalt') => {
    var _a;
    return ({
        key: (0, crypto_1.scryptSync)((_a = process.env.TYPEORM_ENCRYPTION_KEY) !== null && _a !== void 0 ? _a : '', salt.split('').reverse().join('salt'), 32).toString('hex'),
        algorithm: 'aes-256-cbc',
        ivLength: 16,
    });
};
exports.typeormEncryptionConfig = typeormEncryptionConfig;
//# sourceMappingURL=typeorm-encryption.config.js.map