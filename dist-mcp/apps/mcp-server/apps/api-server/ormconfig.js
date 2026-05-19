"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const src_1 = require("../../libs/config/src");
exports.AppDataSource = new typeorm_1.DataSource((0, src_1.typeormConfig)());
//# sourceMappingURL=ormconfig.js.map