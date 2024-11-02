"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.relatorioRoutes = void 0;
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const authenticate_1 = require("../plugins/authenticate");
const dayjs_1 = __importDefault(require("dayjs"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
async function relatorioRoutes(fastify) {
    // relatorio usuarios palpitaram ou nao
    fastify.get("/relatorio/palpites/status/:bolao_id/:data", {
        onRequest: [authenticate_1.authenticate],
    }, async (request, reply) => {
        try {
            let user = await prisma_1.prisma.usuario.findFirst({
                where: {
                    id: Number(request.user.sub),
                },
                select: {
                    isAdmin: true,
                },
            });
            if (!user) {
                return reply.status(400).send({
                    message: "Usuário não existe",
                });
            }
            if (!user.isAdmin) {
                return reply.status(400).send({
                    message: "Usuário não possui permissão",
                });
            }
            const getBolaoParams = zod_1.z.object({
                bolao_id: zod_1.z.string(),
                data: zod_1.z.string(),
            });
            const { bolao_id, data } = getBolaoParams.parse(request.params);
            dayjs_1.default.extend(utc_1.default);
            const dateInicial = dayjs_1.default.utc(data);
            const dateFinal = dateInicial.add(1, "day");
            const dateInicialComUTC4 = dateInicial.add(4, "hour");
            const dateFinalComUTC4 = dateFinal.add(4, "hour");
            const filtroData = {
                AND: [
                    {
                        data: {
                            gte: dateInicialComUTC4.format(),
                        },
                    },
                    {
                        data: {
                            lt: dateFinalComUTC4.format(),
                        },
                    },
                ],
            };
            const resultado = await prisma_1.prisma.participante.findMany({
                where: {
                    bolao_id: Number(bolao_id),
                },
                select: {
                    usuario_id: true,
                    usuario: {
                        select: {
                            nome: true,
                        },
                    },
                    bolao: {
                        select: {
                            Jogos_bolao: {
                                select: {
                                    jogo: {
                                        select: {
                                            id: true,
                                            data: true,
                                        },
                                    },
                                },
                                where: {
                                    jogo: filtroData,
                                },
                            },
                        },
                    },
                    palpites: {
                        select: {
                            jogoBolao: {
                                select: {
                                    jogo: {
                                        select: {
                                            id: true,
                                            data: true,
                                        },
                                    },
                                },
                            },
                        },
                        where: {
                            jogoBolao: {
                                jogo: filtroData,
                            },
                        },
                    },
                },
            });
            const participantes = resultado.map((participante) => {
                const totalJogosRodada = participante.bolao.Jogos_bolao.length;
                const totalPalpitesUsuario = participante.palpites.length;
                return {
                    participante_id: participante.usuario_id,
                    nome_usuario: participante.usuario.nome,
                    total_jogos_rodada: totalJogosRodada,
                    total_palpites_usuario: totalPalpitesUsuario,
                    palpites_faltando: totalJogosRodada - totalPalpitesUsuario,
                    status_palpites: totalJogosRodada === totalPalpitesUsuario
                        ? "Completo"
                        : "Pendente",
                };
            });
            return participantes.sort((a, b) => b.palpites_faltando - a.palpites_faltando);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            return reply.status(400).send({
                message: message,
            });
        }
    });
}
exports.relatorioRoutes = relatorioRoutes;
