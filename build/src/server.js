"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
//import * as dotenv from 'dotenv'
//dotenv.config()
require("dotenv").config();
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const bolao_1 = require("./routes/bolao");
const auth_1 = require("./routes/auth");
const jogo_1 = require("./routes/jogo");
const palpite_1 = require("./routes/palpite");
const usuario_1 = require("./routes/usuario");
const ranking_1 = require("./routes/ranking");
const relatorio_1 = require("./routes/relatorio");
async function bootstrap() {
    const fastify = (0, fastify_1.default)({
    //logger: true,
    });
    await fastify.register(cors_1.default, {
        //origin: "*",
        origin: true,
        allowedHeaders: [
            "Origin",
            "X-Requested-With",
            "Accept",
            "Content-Type",
            "Authorization",
        ],
        methods: ["GET", "PUT", "OPTIONS", "POST", "DELETE"],
    });
    await fastify.register(jwt_1.default, {
        secret: process.env.SECRETJWT || "",
    });
    await fastify.register(bolao_1.bolaoRoutes);
    await fastify.register(auth_1.authRoutes);
    await fastify.register(jogo_1.jogoRoutes);
    await fastify.register(palpite_1.palpiteRoutes);
    await fastify.register(usuario_1.usuarioRoutes);
    await fastify.register(ranking_1.rankingRoutes);
    await fastify.register(relatorio_1.relatorioRoutes);
    await fastify.listen({ port: 3333, host: "0.0.0.0" });
}
bootstrap();
