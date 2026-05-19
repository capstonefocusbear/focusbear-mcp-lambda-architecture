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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PusherBeamsService = void 0;
const common_1 = require("@nestjs/common");
const PusherBeams = require("@pusher/push-notifications-server");
const pusher_beams_publish_request_model_1 = require("./domains/pusher-beams-publish-request.model");
const pusher_beams_constants_1 = require("./pusher-beams.constants");
let PusherBeamsService = class PusherBeamsService extends PusherBeams {
    constructor(options) {
        super(Object.assign({}, options));
        this.options = options;
    }
    createBeamsPublishRequest({ title, body, pushData, should_send_only_data_for_android = false, }) {
        const data = {
            apns: {
                aps: { alert: { title, body } },
                data: pushData,
            },
            fcm: Object.assign(Object.assign({}, (!should_send_only_data_for_android && {
                notification: {
                    title,
                    body,
                },
            })), { data: pushData }),
        };
        const beamsPublishRequest = new pusher_beams_publish_request_model_1.BeamsPublishRequest(data);
        return beamsPublishRequest;
    }
};
exports.PusherBeamsService = PusherBeamsService;
exports.PusherBeamsService = PusherBeamsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(pusher_beams_constants_1.PUSHER_BEAMS_MODULE_OPTIONS)),
    __metadata("design:paramtypes", [Object])
], PusherBeamsService);
//# sourceMappingURL=pusher-beams.service.js.map