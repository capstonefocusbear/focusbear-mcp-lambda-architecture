"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var R2Service_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.R2Service = void 0;
const common_1 = require("@nestjs/common");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const r2_constants_1 = require("../r2.constants");
const constants_1 = require("../../../../apps/api-server/src/shared/utils/constants");
let R2Service = R2Service_1 = class R2Service {
    constructor(r2Options) {
        this.r2Options = r2Options;
        this.logger = new common_1.Logger(R2Service_1.name);
        this.s3Client = new client_s3_1.S3Client({
            region: this.r2Options.region || 'auto',
            endpoint: this.r2Options.endpoint,
            credentials: {
                accessKeyId: this.r2Options.accessKeyId,
                secretAccessKey: this.r2Options.secretAccessKey,
            },
        });
    }
    async getPresignedUrl(bucket, key) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: bucket,
            Key: key,
        });
        const url = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, { expiresIn: constants_1.ONE_WEEK_IN_SECONDS });
        return url;
    }
    async addObjectToBucket(bucket, key, body) {
        const buf = Buffer.from(JSON.stringify(body));
        const objectData = {
            Bucket: bucket,
            Key: `${key}.json`,
            Body: buf,
            ContentEncoding: 'base64',
            ContentType: 'application/json',
            ContentDisposition: 'attachment',
        };
        const command = new client_s3_1.PutObjectCommand(objectData);
        await this.s3Client.send(command);
    }
    async uploadFileToBucket(bucket, key, body, contentType) {
        const fileData = {
            Bucket: bucket,
            Body: body,
            Key: key,
            ContentType: contentType,
        };
        const command = new client_s3_1.PutObjectCommand(fileData);
        await this.s3Client.send(command);
    }
    async getPresignedUploadUrl(bucket, key, contentType) {
        const command = new client_s3_1.PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: contentType,
        });
        try {
            const url = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, { expiresIn: constants_1.FIFTEEN_MINUTES_IN_SECONDS });
            return url;
        }
        catch (error) {
            throw new Error(`Could not get presigned URL: ${error.message}`);
        }
    }
    async getJsonFromBucket(bucket, key) {
        var _a, e_1, _b, _c;
        const command = new client_s3_1.GetObjectCommand({
            Bucket: bucket,
            Key: `${key}.json`,
        });
        const response = await this.s3Client.send(command);
        const stream = response.Body;
        const chunks = [];
        try {
            for (var _d = true, stream_1 = __asyncValues(stream), stream_1_1; stream_1_1 = await stream_1.next(), _a = stream_1_1.done, !_a; _d = true) {
                _c = stream_1_1.value;
                _d = false;
                const chunk = _c;
                chunks.push(chunk);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = stream_1.return)) await _b.call(stream_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        const data = Buffer.concat(chunks).toString('utf-8');
        return JSON.parse(data);
    }
    async deleteObject(bucket, key) {
        const command = new client_s3_1.DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
        });
        try {
            await this.s3Client.send(command);
        }
        catch (error) {
            this.logger.error(`Failed to delete object ${key} from bucket ${bucket}: ${error.message}`);
            throw error;
        }
    }
    async getObjectMetadata(bucket, key) {
        const command = new client_s3_1.HeadObjectCommand({
            Bucket: bucket,
            Key: key,
        });
        try {
            const response = await this.s3Client.send(command);
            return {
                contentLength: response.ContentLength || 0,
                contentType: response.ContentType || 'application/octet-stream',
            };
        }
        catch (error) {
            this.logger.error(`Failed to get metadata for object ${key} from bucket ${bucket}: ${error.message}`);
            throw error;
        }
    }
};
exports.R2Service = R2Service;
exports.R2Service = R2Service = R2Service_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(r2_constants_1.R2_MODULE_OPTIONS)),
    __metadata("design:paramtypes", [Object])
], R2Service);
//# sourceMappingURL=r2.service.js.map