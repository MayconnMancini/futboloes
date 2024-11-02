import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate } from "../plugins/authenticate";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

export async function relatorioRoutes(fastify: FastifyInstance) {
  // relatorio usuarios palpitaram ou nao
  fastify.get(
    "/relatorio/palpites/status/:bolao_id/:data",
    {
      onRequest: [authenticate],
    },
    async (request, reply) => {
      try {
        let user = await prisma.usuario.findFirst({
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

        const getBolaoParams = z.object({
          bolao_id: z.string(),
          data: z.string(),
        });

        const { bolao_id, data } = getBolaoParams.parse(request.params);
        dayjs.extend(utc);

        const dateInicial = dayjs.utc(data);
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

        const resultado = await prisma.participante.findMany({
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
            status_palpites:
              totalJogosRodada === totalPalpitesUsuario
                ? "Completo"
                : "Pendente",
          };
        });

        return participantes.sort(
          (a, b) => b.palpites_faltando - a.palpites_faltando
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return reply.status(400).send({
          message: message,
        });
      }
    }
  );
}
