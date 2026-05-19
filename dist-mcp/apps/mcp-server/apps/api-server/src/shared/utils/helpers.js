"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.constructLogUploadEmailBody = exports.escapeMarkdownForCliq = exports.safeDecodeURIComponent = exports.getR2FileNameFromUrl = exports.callPromiseWithTimeout = exports.prettyJson = exports.convertMinutesToSeconds = exports.FieldTransformer = exports.isUUID = exports.hhmmToSeconds = exports.secondsTohhmm = exports.secondsToHHMM = exports.getDataCenterUrl = void 0;
exports.wait = wait;
exports.maskEmail = maskEmail;
exports.findNonZeroTotal = findNonZeroTotal;
exports.withTimeout = withTimeout;
exports.isValidEmail = isValidEmail;
exports.timed = timed;
const crypto = require("crypto");
const constants_1 = require("./constants");
const dotenv = require('dotenv');
dotenv.config();
function wait(seconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, seconds * 1000);
    });
}
const dataCenterUrl = {
    au: {
        api: 'https://projectsapi.zoho.com.au/restapi',
        accounts: 'https://accounts.zoho.com.au',
    },
    eu: {
        api: 'https://projectsapi.zoho.eu/restapi',
        accounts: 'https://accounts.zoho.eu',
    },
    in: {
        api: 'https://projectsapi.zoho.in/restapi',
        accounts: 'https://accounts.zoho.in',
    },
    us: {
        api: 'https://projectsapi.zoho.com/restapi',
        accounts: 'https://accounts.zoho.com',
    },
    jp: {
        api: 'https://projectsapi.zoho.jp/restapi',
        accounts: 'https://accounts.zoho.jp',
    },
    uk: {
        api: 'https://projectsapi.zoho.co.uk/restapi',
        accounts: 'https://accounts.zoho.co.uk',
    },
};
const getDataCenterUrl = (location) => {
    if (dataCenterUrl[location]) {
        return dataCenterUrl[location];
    }
    return {
        api: `https://projectsapi.zoho.com.${location}/restapi`,
        accounts: `https://accounts.zoho.co.${location}`,
    };
};
exports.getDataCenterUrl = getDataCenterUrl;
const secondsToHHMM = (seconds) => {
    const hours = Math.floor(seconds / constants_1.ONE_HOUR_SECONDS);
    const minutes = Math.floor((seconds % constants_1.ONE_HOUR_SECONDS) / constants_1.ONE_MINUTE_SECONDS);
    const hoursStr = String(hours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    return `${hoursStr}:${minutesStr}`;
};
exports.secondsToHHMM = secondsToHHMM;
const secondsTohhmm = (seconds) => {
    const hours = Math.floor(seconds / constants_1.ONE_HOUR_SECONDS);
    const minutes = Math.floor((seconds % constants_1.ONE_HOUR_SECONDS) / constants_1.ONE_MINUTE_SECONDS);
    return `${hours}h ${minutes}m`;
};
exports.secondsTohhmm = secondsTohhmm;
const hhmmToSeconds = (duration) => {
    const [hour, min] = duration.split(' ');
    const hours = parseInt(hour.replace('h', ''), 10);
    const mins = parseInt(min.replace('m', ''), 10);
    return hours * constants_1.ONE_HOUR_SECONDS + mins * constants_1.ONE_MINUTE_SECONDS;
};
exports.hhmmToSeconds = hhmmToSeconds;
function maskEmail(email) {
    const [username, domain] = email.split('@');
    if (!username || !domain) {
        return email;
    }
    const midPoint = Math.ceil(username.length / 2);
    const unmaskedPart = username.substring(0, midPoint);
    const maskedPart = '*'.repeat(username.length - midPoint);
    return `${unmaskedPart}${maskedPart}@${domain}`;
}
function findNonZeroTotal(invoices) {
    for (const invoice of invoices) {
        if (invoice.total !== 0) {
            return invoice.total;
        }
    }
    return 0;
}
const isUUID = (str) => {
    const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return uuidPattern.test(str);
};
exports.isUUID = isUUID;
const ENCRYPTION_KEY = process.env.FIELD_TRANSFORMER_ENCRYPTION_KEY;
function evpBytesToKey(password, salt = Buffer.alloc(0), keyLen = 32) {
    const data = Buffer.concat([Buffer.from(password, 'utf8'), salt]);
    let key = Buffer.alloc(0);
    while (key.length < keyLen) {
        const hash = crypto.createHash('md5');
        hash.update(key.length > 0 ? Buffer.concat([key, data]) : data);
        const digest = hash.digest();
        key = Buffer.concat([key, digest]);
    }
    return key.subarray(0, keyLen);
}
exports.FieldTransformer = {
    to: (value) => {
        if (value === undefined || value === '')
            return '';
        if (!ENCRYPTION_KEY)
            throw new Error('ENCRYPTION_KEY is not set');
        const key = evpBytesToKey(ENCRYPTION_KEY);
        const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
        let encrypted = cipher.update(value, 'utf-8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    },
    from: (value) => {
        if (value === undefined || value === '')
            return '';
        if (!ENCRYPTION_KEY)
            throw new Error('ENCRYPTION_KEY is not set');
        const key = evpBytesToKey(ENCRYPTION_KEY);
        const decipher = crypto.createDecipheriv('aes-256-ecb', key, null);
        let decrypted = decipher.update(value, 'hex', 'utf-8');
        decrypted += decipher.final('utf-8');
        return decrypted;
    },
};
const convertMinutesToSeconds = (minutes, seconds) => minutes * 60 + (seconds !== null && seconds !== void 0 ? seconds : 0);
exports.convertMinutesToSeconds = convertMinutesToSeconds;
const prettyJson = (obj, mode = 'standard', keyOnTop) => {
    switch (mode.toLowerCase()) {
        case 'standard': {
            const formatObject = (thisObj, indent = 0) => {
                let result = '';
                const indentation = '  '.repeat(indent);
                for (const [key, value] of Object.entries(thisObj)) {
                    if (typeof value === 'object' && value !== null) {
                        result += `${indentation}${key}:\n`;
                        result += formatObject(value, indent + 2);
                    }
                    else {
                        result += `${indentation}${key}: ${value}\n`;
                    }
                }
                return result;
            };
            return formatObject(obj);
        }
        case 'pretty': {
            return JSON.stringify(obj, null, 4);
        }
        case 'jsonarray': {
            if (!Array.isArray(obj)) {
                return obj;
            }
            if (Array.isArray(obj) && obj.length === 0) {
                return '[]';
            }
            let reorder = false;
            if (keyOnTop !== undefined || keyOnTop !== null) {
                reorder = true;
            }
            let result = '';
            for (let i = 0; i < obj.length; i++) {
                if (reorder) {
                    result += `${i + 1}: ${JSON.stringify((0, exports.prettyJson)(obj[i], 'reorder', keyOnTop))}\n\n`;
                }
                else {
                    result += `${i + 1}: ${JSON.stringify(obj[i])}\n\n`;
                }
            }
            return result;
        }
        case 'reorder': {
            const reorderedObj = Object.assign({ [keyOnTop]: obj[keyOnTop] }, obj);
            return reorderedObj;
        }
        default: {
            throw new Error('Invalid mode: Supported modes include: [standard, pretty, jsonarray, reorder]');
        }
    }
};
exports.prettyJson = prettyJson;
const callPromiseWithTimeout = async (apiCall, timeoutMs) => {
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeoutMs));
    return Promise.race([apiCall, timeoutPromise]);
};
exports.callPromiseWithTimeout = callPromiseWithTimeout;
const getR2FileNameFromUrl = (url) => {
    if (!url)
        return url;
    try {
        const decodedUrl = decodeURIComponent(url);
        const { pathname } = new URL(decodedUrl);
        return pathname.substring(pathname.lastIndexOf('/') + 1);
    }
    catch (_a) {
        return url;
    }
};
exports.getR2FileNameFromUrl = getR2FileNameFromUrl;
const safeDecodeURIComponent = (str) => {
    if (!str)
        return str;
    try {
        const withSpaces = str.replace(/\+/g, ' ');
        return decodeURIComponent(withSpaces);
    }
    catch (_a) {
        return str;
    }
};
exports.safeDecodeURIComponent = safeDecodeURIComponent;
const escapeMarkdownForCliq = (text) => {
    if (!text)
        return text;
    const decoded = (0, exports.safeDecodeURIComponent)(text);
    return decoded
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\*/g, '\\*')
        .replace(/_/g, '\\_');
};
exports.escapeMarkdownForCliq = escapeMarkdownForCliq;
const constructLogUploadEmailBody = (notifyLogsUploadSuccessDto, downloadUrl, userId) => {
    const { feedback_message, app_platform, app_version } = notifyLogsUploadSuccessDto;
    const decodedFeedback = (0, exports.safeDecodeURIComponent)(feedback_message || '');
    const escapedFeedbackMessage = decodedFeedback
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    return `
    <p>Hi Focus Bear support team,</p>

    <p>A user has submitted feedback along with app usage logs. Please review the details below:</p>

    <p><strong>User ID:</strong> ${userId}</p>
    <p><strong>Feedback:</strong></p>
    <blockquote>${escapedFeedbackMessage}</blockquote>

    <p><strong>App platform:</strong> ${app_platform}</p>
    <p><strong>App version:</strong> ${app_version}</p>

    <p><strong>Logs download link:</strong><br/>
    <a href="${downloadUrl}">View Uploaded Logs</a></p>

    <p>— Automated Notification System</p>
  `;
};
exports.constructLogUploadEmailBody = constructLogUploadEmailBody;
function withTimeout(promise, ms, timeoutMessage = 'Operation timed out', onTimeout) {
    let timeoutId;
    const timeoutPromise = new Promise((_resolve, reject) => {
        var _a;
        const handleTimeout = async () => {
            promise.catch(() => undefined);
            try {
                await (onTimeout === null || onTimeout === void 0 ? void 0 : onTimeout());
            }
            catch (_a) {
            }
            reject(new Error(timeoutMessage));
        };
        timeoutId = setTimeout(() => {
            handleTimeout().catch(() => undefined);
        }, ms);
        (_a = timeoutId === null || timeoutId === void 0 ? void 0 : timeoutId.unref) === null || _a === void 0 ? void 0 : _a.call(timeoutId);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    });
}
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
async function timed(operation, options) {
    const { operationName, budgetMs, logger, context = {} } = options;
    const startTime = Date.now();
    const warnIfBudgetExceeded = (durationMs, error) => {
        if (durationMs <= budgetMs)
            return;
        const suffix = error ? ' (failed)' : '';
        logger.warn(Object.assign(Object.assign({ operationName,
            budgetMs, actualMs: durationMs, exceededByMs: durationMs - budgetMs }, (error && { error: error instanceof Error ? error.message : String(error) })), context), `Performance budget exceeded for ${operationName}${suffix}: ${durationMs}ms (budget: ${budgetMs}ms)`);
    };
    try {
        const result = await operation();
        const durationMs = Date.now() - startTime;
        warnIfBudgetExceeded(durationMs);
        return { result, durationMs };
    }
    catch (error) {
        const durationMs = Date.now() - startTime;
        warnIfBudgetExceeded(durationMs, error);
        throw error;
    }
}
//# sourceMappingURL=helpers.js.map