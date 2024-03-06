import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate } from "../plugins/authenticate";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import axios from "axios";
import { Palpite } from "@prisma/client";

/*
  PONTUAÇÃO EXATA : 20 PONTOS
  ACERTOU O TIME VITORIOSO: 10 PONTOS
  ACERTOU QUE VAI DAR EMPATE: 10 PONTOS
*/

export async function rankingRoutes(fastify: FastifyInstance) {
  // buscar bolão por ID ### OK ###
  fastify.get(
    "/ranking/bolao/:bolao_id",
    {
      onRequest: [authenticate],
    },
    async (request) => {
      const getBolaoParams = z.object({
        bolao_id: z.string(),
      });

      const { bolao_id } = getBolaoParams.parse(request.params);

      const participantes = await prisma.participante.findMany({
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
        c1.totalPontos < c2.totalPontos
          ? 1
          : c1.totalPontos > c2.totalPontos
          ? -1
          : 0
      );

      //return {
      //  jogos_bolao: bolao.map(bolao => {
      //    return {
      //      //...jogo,
      //      palpite: bolao.palpites.length > 0 ? bolao.palpites[0] : null,
      //      palpites: undefined,
      //    }
      //  })
      //}
    }
  );

  // ranking por bolao por data
  fastify.get(
    "/ranking/bolao/:bolao_id/:data",
    {
      onRequest: [authenticate],
    },
    async (request) => {
      const getBolaoParams = z.object({
        bolao_id: z.string(),
        data: z.string(),
      });

      const { bolao_id, data } = getBolaoParams.parse(request.params);
      dayjs.extend(utc);

      console.log(dayjs(data).format());
      console.log(dayjs(data).add(1, "day").format());

      /*
      const palpites = await prisma.jogo_bolao.findMany({
        where: {
          bolao_id: Number(bolao_id),
          jogo: {
            AND: [
              {
                data: {
                  gte: dayjs(data).format(),
                },
              },
              {
                data: {
                  lt: dayjs(data).add(1, "day").format(),
                },
              },
            ],
          },
        },
        include: {
          jogo: true,
          palpites: {
            include: {
              participante: {
                include: {
                  usuario: true,
                },
              },
            },
          },
        },
      });
      */

      const groupUsers = await prisma.palpite.groupBy({
        by: ["participante_id"],
        _sum: {
          pontuacao: true,
        },
        where: {
          jogoBolao: {
            bolao_id: Number(bolao_id),
            jogo: {
              AND: [
                {
                  data: {
                    gte: dayjs(data).format(),
                  },
                },
                {
                  data: {
                    lt: dayjs(data).add(1, "day").format(),
                  },
                },
              ],
            },
          },
        },
      });

      console.log("groupUsers", groupUsers);

      const palpites = await prisma.palpite.aggregate({
        where: {
          jogoBolao: {
            bolao_id: Number(bolao_id),
            jogo: {
              AND: [
                {
                  data: {
                    gte: dayjs(data).format(),
                  },
                },
                {
                  data: {
                    lt: dayjs(data).add(1, "day").format(),
                  },
                },
              ],
            },
          },
        },
        _sum: {
          pontuacao: true,
        },
      });

      return palpites;
    }
  );
}
