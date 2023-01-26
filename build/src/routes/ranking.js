"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rankingRoutes = void 0;
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const authenticate_1 = require("../plugins/authenticate");
/*
  PONTUAÇÃO EXATA : 20 PONTOS
  ACERTOU O TIME VITORIOSO: 10 PONTOS
  ACERTOU QUE VAI DAR EMPATE: 10 PONTOS
*/
async function rankingRoutes(fastify) {
    // buscar bolão por ID ### OK ###
    fastify.get('/ranking/bolao/:bolao_id', {
        onRequest: [authenticate_1.authenticate]
    }, async (request) => {
        const getBolaoParams = zod_1.z.object({
            bolao_id: zod_1.z.string(),
        });
        const { bolao_id } = getBolaoParams.parse(request.params);
        const participantes = await prisma_1.prisma.participante.findMany({
            where: {
                bolao_id: Number(bolao_id)
            },
            include: {
                usuario: {
                    select: {
                        id: true,
                        nome: true,
                        avatarUrl: true,
                    }
                },
                palpites: true,
            }
        });
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
                    totalPontos: sum
                };
            });
        }
        return ranking?.sort((c1, c2) => (c1.totalPontos < c2.totalPontos) ? 1 : (c1.totalPontos > c2.totalPontos) ? -1 : 0);
        //return {
        //  jogos_bolao: bolao.map(bolao => {
        //    return {
        //      //...jogo,
        //      palpite: bolao.palpites.length > 0 ? bolao.palpites[0] : null,
        //      palpites: undefined,
        //    }
        //  })
        //}
    });
}
exports.rankingRoutes = rankingRoutes;
