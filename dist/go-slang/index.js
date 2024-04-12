"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.goRunner = void 0;
const runner_1 = require("../runner");
const ece_1 = require("./ece");
function goRunner(program, heapSize, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const value = (0, ece_1.evaluate)(program, heapSize, context);
        if (context.errors.length > 0) {
            return runner_1.resolvedErrorPromise;
        }
        return { status: 'finished', context, value };
    });
}
exports.goRunner = goRunner;
//# sourceMappingURL=index.js.map