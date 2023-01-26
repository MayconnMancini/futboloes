"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
async function authenticate(request) {
    await request.jwtVerify();
}
exports.authenticate = authenticate;
