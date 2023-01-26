"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const bolao_1 = require("./routes/bolao");
const auth_1 = require("./routes/auth");
const jogo_1 = require("./routes/jogo");
const palpite_1 = require("./routes/palpite");
const usuario_1 = require("./routes/usuario");
const ranking_1 = require("./routes/ranking");
async function bootstrap() {
    // cria um log
    const fastify = (0, fastify_1.default)({
        logger: true,
    });
    await fastify.register(cors_1.default, {
        origin: 'true',
    });
    // em produção isso precisa ser uma variável ambiente
    await fastify.register(jwt_1.default, {
        secret: process.env.SECRETJWT || "futboloes",
    });
    // importa as rotas
    await fastify.register(bolao_1.bolaoRoutes);
    await fastify.register(auth_1.authRoutes);
    await fastify.register(jogo_1.jogoRoutes);
    await fastify.register(palpite_1.palpiteRoutes);
    await fastify.register(usuario_1.usuarioRoutes);
    await fastify.register(ranking_1.rankingRoutes);
    // servidor escuta na porta 3333
    await fastify.listen({ port: 3333, host: '0.0.0.0' });
}
bootstrap();
