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
var SendGridService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendGridService = void 0;
const common_1 = require("@nestjs/common");
const sendGrid = require("@sendgrid/mail");
const send_grid_constants_1 = require("./send-grid.constants");
const email_utils_1 = require("./email-utils");
let SendGridService = SendGridService_1 = class SendGridService {
    constructor(options) {
        this.options = options;
        this.logger = new common_1.Logger(SendGridService_1.name);
        this.sendGridClient = sendGrid;
        this.sendGridClient.setApiKey(this.options.apiKey);
    }
    async sendEmail(payload, isMultiple) {
        const payloads = (Array.isArray(payload) ? payload : [payload]);
        const filteredPayloads = [];
        let suppressedRecipientCount = 0;
        let suppressedPayloadCount = 0;
        for (const payloadItem of payloads) {
            const filteredPayload = Object.assign({}, payloadItem);
            const toResult = (0, email_utils_1.filterTestRecipients)(filteredPayload.to);
            const ccResult = (0, email_utils_1.filterTestRecipients)(filteredPayload.cc);
            const bccResult = (0, email_utils_1.filterTestRecipients)(filteredPayload.bcc);
            suppressedRecipientCount +=
                toResult.removedEmails.length + ccResult.removedEmails.length + bccResult.removedEmails.length;
            filteredPayload.to = toResult.filtered;
            filteredPayload.cc = ccResult.filtered;
            filteredPayload.bcc = bccResult.filtered;
            if ((0, email_utils_1.extractEmails)(filteredPayload.to).length === 0) {
                suppressedPayloadCount += 1;
            }
            else {
                filteredPayloads.push(filteredPayload);
            }
        }
        if (suppressedRecipientCount > 0) {
            this.logger.warn(`Suppressed ${suppressedRecipientCount} test recipient(s) across ${suppressedPayloadCount} skipped payload(s).`);
        }
        if (filteredPayloads.length === 0) {
            return;
        }
        const filteredPayload = Array.isArray(payload)
            ? filteredPayloads
            : filteredPayloads[0];
        if (!filteredPayload) {
            return;
        }
        return this.sendGridClient.send(filteredPayload, isMultiple);
    }
};
exports.SendGridService = SendGridService;
exports.SendGridService = SendGridService = SendGridService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(send_grid_constants_1.SEND_GRID_MODULE_OPTIONS)),
    __metadata("design:paramtypes", [Object])
], SendGridService);
//# sourceMappingURL=send-grid.service.js.map