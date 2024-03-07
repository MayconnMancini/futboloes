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

      return ranking?.sort((c1: any, c2: any) => {
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

      const dateInicial = dayjs.utc(data);
      const dateInicialComUTC4 = dateInicial.add(4, "hour");

      const dateFinal = dateInicial.add(1, "day");
      const dateFinalComUTC4 = dateFinal.add(4, "hour");

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

      return ranking?.sort((c1: any, c2: any) => {
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
    }
  );
}
