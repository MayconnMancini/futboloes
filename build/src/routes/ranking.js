"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rankingRoutes = void 0;
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const authenticate_1 = require("../plugins/authenticate");
const dayjs_1 = __importDefault(require("dayjs"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
/*
  PONTUAÇÃO EXATA : 20 PONTOS
  ACERTOU O TIME VITORIOSO: 10 PONTOS
  ACERTOU QUE VAI DAR EMPATE: 10 PONTOS
*/
async function rankingRoutes(fastify) {
    // buscar bolão por ID ### OK ###
    fastify.get("/ranking/bolao/:bolao_id", {
        onRequest: [authenticate_1.authenticate],
    }, async (request) => {
        const getBolaoParams = zod_1.z.object({
            bolao_id: zod_1.z.string(),
        });
        const { bolao_id } = getBolaoParams.parse(request.params);
        const participantes = await prisma_1.prisma.participante.findMany({
            where: {
                bolao_id: Number(bolao_id),
            },
            include: {
                usuario: {
                    select: {
                        id: true,
                        nome: true,
                        avatarUrl: true,
                    },
                },
                palpites: true,
            },
        });
        let ranking;
        if (participantes) {
            ranking = participantes.map((p) => {
                const palpites = p.palpites || [];
                const totalPontos = palpites
                    .filter((palpite) => palpite.pontuacao !== null)
                    .reduce((acc, palpite) => acc + Number(palpite.pontuacao), 0);
                const exato = palpites.filter((palpite) => palpite.pontuacao === 21).length;
                const vencedorEmpate = palpites.filter((palpite) => palpite.pontuacao === 10).length;
                const errado = palpites.filter((palpite) => palpite.pontuacao === 0).length;
                return {
                    id_participante: p.id,
                    bolao_id: p.bolao_id,
                    ...p.usuario,
                    totalPontos,
                    exato,
                    vencedorEmpate,
                    errado,
                };
            });
        }
        return ranking?.sort((c1, c2) => {
            if (c1.totalPontos !== c2.totalPontos) {
                return c1.totalPontos < c2.totalPontos ? 1 : -1;
            }
            if (c1.exato !== c2.exato) {
                return c1.exato < c2.exato ? 1 : -1;
            }
            if (c1.vencedorEmpate !== c2.vencedorEmpate) {
                return c1.vencedorEmpate < c2.vencedorEmpate ? 1 : -1;
            }
            return 0; // Retorna 0 se todas as propriedades forem iguais
        });
        /*
        let ranking;
        if (participantes) {
          ranking = participantes.map((p) => {
            let sum = 0;
            if (p.palpites) {
              let palp = p.palpites;
              for (let i = 0; i < palp.length; i++) {
                if (palp[i].pontuacao != null) {
                  sum += Number(palp[i].pontuacao);
                }
              }
            }
            return {
              id_participante: p.id,
              bolao_id: p.bolao_id,
              ...p.usuario,
              totalPontos: sum,
            };
          });
        }
  
        return ranking?.sort((c1: any, c2: any) =>
          c1.totalPontos < c2.totalPontos ? 1 : c1.totalPontos > c2.totalPontos ? -1 : 0
        );
        */
    });
    // ranking por bolao por data
    fastify.get("/ranking/bolao/:bolao_id/:data", {
        onRequest: [authenticate_1.authenticate],
    }, async (request) => {
        const getBolaoParams = zod_1.z.object({
            bolao_id: zod_1.z.string(),
            data: zod_1.z.string(),
        });
        const { bolao_id, data } = getBolaoParams.parse(request.params);
        dayjs_1.default.extend(utc_1.default);
        const dateInicial = dayjs_1.default.utc(data);
        const dateInicialComUTC4 = dateInicial.add(4, "hour");
        const dateFinal = dateInicial.add(1, "day");
        const dateFinalComUTC4 = dateFinal.add(4, "hour");
        const participantes = await prisma_1.prisma.participante.findMany({
            where: {
                bolao_id: Number(bolao_id),
            },
            include: {
                usuario: {
                    select: {
                        id: true,
                        nome: true,
                        avatarUrl: true,
                    },
                },
                palpites: {
                    where: {
                        jogoBolao: {
                            jogo: {
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
                            },
                        },
                    },
                },
            },
        });
        let ranking;
        if (participantes) {
            ranking = participantes.map((p) => {
                const palpites = p.palpites || [];
                const totalPontos = palpites
                    .filter((palpite) => palpite.pontuacao !== null)
                    .reduce((acc, palpite) => acc + Number(palpite.pontuacao), 0);
                const exato = palpites.filter((palpite) => palpite.pontuacao === 21).length;
                const vencedorEmpate = palpites.filter((palpite) => palpite.pontuacao === 10).length;
                const errado = palpites.filter((palpite) => palpite.pontuacao === 0).length;
                return {
                    id_participante: p.id,
                    bolao_id: p.bolao_id,
                    ...p.usuario,
                    totalPontos,
                    exato,
                    vencedorEmpate,
                    errado,
                };
            });
        }
        return ranking?.sort((c1, c2) => {
            if (c1.totalPontos !== c2.totalPontos) {
                return c1.totalPontos < c2.totalPontos ? 1 : -1;
            }
            if (c1.exato !== c2.exato) {
                return c1.exato < c2.exato ? 1 : -1;
            }
            if (c1.vencedorEmpate !== c2.vencedorEmpate) {
                return c1.vencedorEmpate < c2.vencedorEmpate ? 1 : -1;
            }
            return 0; // Retorna 0 se todas as propriedades forem iguais
        });
    });
}
exports.rankingRoutes = rankingRoutes;
