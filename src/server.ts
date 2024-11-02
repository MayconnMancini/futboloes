//import * as dotenv from 'dotenv'
//dotenv.config()
require("dotenv").config();

import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";

import { bolaoRoutes } from "./routes/bolao";
import { authRoutes } from "./routes/auth";
import { jogoRoutes } from "./routes/jogo";
import { palpiteRoutes } from "./routes/palpite";
import { usuarioRoutes } from "./routes/usuario";
import { date } from "zod";
import { rankingRoutes } from "./routes/ranking";
import { relatorioRoutes } from "./routes/relatorio";

async function bootstrap() {
  const fastify = Fastify({
    //logger: true,
  });

  await fastify.register(cors, {
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

  await fastify.register(jwt, {
    secret: process.env.SECRETJWT || "",
  });

  await fastify.register(bolaoRoutes);
  await fastify.register(authRoutes);
  await fastify.register(jogoRoutes);
  await fastify.register(palpiteRoutes);
  await fastify.register(usuarioRoutes);
  await fastify.register(rankingRoutes);
  await fastify.register(relatorioRoutes);

  await fastify.listen({ port: 3333, host: "0.0.0.0" });
}

bootstrap();
