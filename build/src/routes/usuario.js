"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usuarioRoutes = void 0;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const authenticate_1 = require("../plugins/authenticate");
async function usuarioRoutes(fastify) {
    fastify.get("/usuarios/count", async () => {
        const count = await prisma_1.prisma.usuario.count();
        return { count };
    });
    fastify.post("/updateUserInfo", { onRequest: [authenticate_1.authenticate] }, async (request, reply) => {
        try {
            const signupBody = zod_1.z.object({
                nome: zod_1.z.string(),
                email: zod_1.z.string().email(),
                cidade: zod_1.z.string(),
                estado: zod_1.z.string(),
                telefone: zod_1.z.string(),
            });
            const { nome, email, cidade, estado, telefone } = signupBody.parse(request.body);
            let usuario = await prisma_1.prisma.usuario.findFirst({
                where: {
                    email: email,
                },
            });
            if (!usuario) {
                return reply.status(400).send({
                    message: "Email não cadastrado",
                });
            }
            if (usuario.id != parseInt(request.user.sub) &&
                usuario.isAdmin == false) {
                return reply.status(400).send({
                    message: "Sem permissão para atualizar informações",
                });
            }
            await prisma_1.prisma.usuario.update({
                where: {
                    email: email,
                },
                data: {
                    nome: nome,
                    cidade: cidade,
                    estado: estado,
                    telefone: telefone,
                },
            });
            return reply.status(201).send({
                message: "Informações do atualizadas com sucesso",
            });
        }
        catch (error) {
            return reply.status(500).send({
                message: `Erro interno do servidor -> ${error}`,
            });
        }
    });
    fastify.get("/getUserInfo/:email", { onRequest: [authenticate_1.authenticate] }, async (request, reply) => {
        try {
            const signupBody = zod_1.z.object({
                email: zod_1.z.string().email(),
            });
            const { email } = signupBody.parse(request.params);
            let usuario = await prisma_1.prisma.usuario.findFirst({
                where: {
                    email: email,
                },
            });
            if (!usuario) {
                return reply.status(400).send({
                    message: "Email não cadastrado",
                });
            }
            if (usuario.id != parseInt(request.user.sub) &&
                request.user.isAdmin === false) {
                return reply.status(400).send({
                    message: "Sem permissão para vizualizar informações",
                });
            }
            return await prisma_1.prisma.usuario.findFirst({
                where: {
                    email: email,
                },
                select: {
                    id: true,
                    nome: true,
                    email: true,
                    cidade: true,
                    estado: true,
                    telefone: true,
                    googleId: true,
                    avatarUrl: true,
                    isAdmin: true,
                    createdAt: true,
                },
            });
        }
        catch (error) {
            return reply.status(500).send({
                message: `Erro interno do servidor -> ${error}`,
            });
        }
    });
    fastify.get("/getAllUsers", { onRequest: [authenticate_1.authenticate] }, async (request, reply) => {
        try {
            if (request.user.isAdmin === false) {
                return reply.status(400).send({
                    message: "Sem permissão para vizualizar informações",
                });
            }
            return await prisma_1.prisma.usuario.findMany();
        }
        catch (error) {
            return reply.status(500).send({
                message: `Erro interno do servidor -> ${error}`,
            });
        }
    });
}
exports.usuarioRoutes = usuarioRoutes;
