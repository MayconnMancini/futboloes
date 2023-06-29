"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const authenticate_1 = require("../plugins/authenticate");
const bcrypt_1 = __importDefault(require("bcrypt"));
async function authRoutes(fastify) {
    fastify.get('/me', {
        onRequest: [authenticate_1.authenticate]
    }, async (request) => {
        console.log("user => " + request.user.isAdmin);
        console.log("request => " + request);
        return { user: request.user };
    });
    fastify.post('/newPassword', {
        onRequest: [authenticate_1.authenticate]
    }, async (request, reply) => {
        try {
            const loginBody = zod_1.z.object({
                email: zod_1.z.string().email(),
                senha: zod_1.z.string(),
            });
            let user = await prisma_1.prisma.usuario.findFirst({
                where: {
                    id: parseInt(request.user.sub)
                }
            });
            if (!user) {
                return reply.status(400).send({
                    message: 'Não autenticado'
                });
            }
            else {
                if (!user.isAdmin) {
                    return reply.status(400).send({
                        message: 'Sem permissão'
                    });
                }
            }
            const { email, senha } = loginBody.parse(request.body);
            let usuario = await prisma_1.prisma.usuario.findFirst({
                where: {
                    email: email
                }
            });
            if (!usuario) {
                return reply.status(400).send({
                    message: 'Email não cadastrado'
                });
            }
            if (senha != null) {
                const hashPassword = await bcrypt_1.default.hash(senha, 10);
                console.log(hashPassword);
                await prisma_1.prisma.usuario.update({
                    where: {
                        email: email
                    },
                    data: {
                        senha: hashPassword
                    }
                });
                return reply.status(201).send({
                    message: "Senha alterada com sucesso"
                });
            }
        }
        catch (error) {
            console.log(error);
        }
    });
    fastify.post('/login', async (request, reply) => {
        try {
            const loginBody = zod_1.z.object({
                email: zod_1.z.string().email(),
                senha: zod_1.z.string(),
            });
            const { email, senha } = loginBody.parse(request.body);
            let usuario = await prisma_1.prisma.usuario.findFirst({
                where: {
                    email: email
                }
            });
            if (!usuario) {
                return reply.status(400).send({
                    message: 'Email não cadastrado'
                });
            }
            if (usuario.senha != null) {
                // verifica se a senha é correta
                if (await bcrypt_1.default.compare(senha, usuario.senha)) {
                    // cria Token JWT
                    const token = fastify.jwt.sign({
                        name: usuario.nome,
                        avatarUrl: usuario.avatarUrl,
                        isAdmin: usuario.isAdmin
                    }, {
                        sub: usuario.id.toString(),
                        expiresIn: '7 days'
                    });
                    return { token };
                }
                else {
                    return reply.status(400).send({
                        message: "Senha incorreta"
                    });
                }
            }
        }
        catch (error) {
            console.log(error);
            return reply.status(500).send({
                message: `Erro interno do servidor -> ${error}`
            });
        }
    });
    fastify.post('/signup', async (request, reply) => {
        try {
            const signupBody = zod_1.z.object({
                nome: zod_1.z.string(),
                email: zod_1.z.string().email(),
                senha: zod_1.z.string(),
            });
            const { nome, email, senha } = signupBody.parse(request.body);
            let usuario = await prisma_1.prisma.usuario.findFirst({
                where: {
                    email: email
                }
            });
            if (usuario) {
                return reply.status(400).send({
                    message: 'Email ja cadastrado'
                });
            }
            const hashPassword = await bcrypt_1.default.hash(senha, 10);
            console.log(hashPassword);
            usuario = await prisma_1.prisma.usuario.create({
                data: {
                    nome: nome,
                    email: email,
                    senha: hashPassword
                }
            });
            return reply.status(201).send({
                message: "Usuário cadastrado com sucesso"
            });
        }
        catch (error) {
            console.log(error);
        }
    });
    // cria usuario e token via autenticação da google
    fastify.post('/usuarios', async (request) => {
        console.log("RECEBI REQUISIÇÃO DE LOGIN");
        const createUserBody = zod_1.z.object({
            access_token: zod_1.z.string(),
        });
        // valida o formato do token
        const { access_token } = createUserBody.parse(request.body);
        console.log("TOKEM RECEBIDO DO FRONTEND");
        console.log(access_token);
        try {
            // faz a requisição para o google
            const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${access_token}`
                }
            });
            console.log("RESPOSTA COM OS DADOS DA GOOGLE");
            console.log(userResponse);
            // salva os dados da resposta do google
            const userData = await userResponse.json();
            // cria schema para validar infos da google
            const userInfoSchema = zod_1.z.object({
                id: zod_1.z.string(),
                email: zod_1.z.string().email(),
                name: zod_1.z.string(),
                picture: zod_1.z.string().url(),
            });
            // valida infos do usuario da google
            const userInfo = userInfoSchema.parse(userData);
            // verifica se ja existe usuario cadastrado com google id
            let usuario = await prisma_1.prisma.usuario.findUnique({
                where: {
                    googleId: userInfo.id,
                }
            });
            // se nao existir usuário, faz o cadastro
            if (!usuario) {
                usuario = await prisma_1.prisma.usuario.create({
                    data: {
                        googleId: userInfo.id,
                        nome: userInfo.name,
                        email: userInfo.email,
                        senha: "null",
                        avatarUrl: userInfo.picture,
                    }
                });
            }
            const idString = usuario.id.toString();
            // cria Token JWT
            const token = fastify.jwt.sign({
                name: usuario.nome,
                avatarUrl: usuario.avatarUrl,
                isAdmin: usuario.isAdmin
            }, {
                sub: idString,
                expiresIn: '7 days',
            });
            return { token };
        }
        catch (error) {
            console.log(error);
        }
    });
}
exports.authRoutes = authRoutes;
