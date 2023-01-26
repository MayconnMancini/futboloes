"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usuarioRoutes = void 0;
const prisma_1 = require("../lib/prisma");
async function usuarioRoutes(fastify) {
    fastify.get('/usuarios/count', async () => {
        const count = await prisma_1.prisma.usuario.count();
        return { count };
    });
}
exports.usuarioRoutes = usuarioRoutes;
