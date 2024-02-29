"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.palpiteRoutes = void 0;
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const authenticate_1 = require("../plugins/authenticate");
/*
  PONTUAÇÃO EXATA : 20 PONTOS
  ACERTOU O TIME VITORIOSO: 10 PONTOS
  ACERTOU QUE VAI DAR EMPATE: 10 PONTOS
*/
async function palpiteRoutes(fastify) {
    fastify.get("/palpites/count", async () => {
        const count = await prisma_1.prisma.palpite.count();
        return { count };
    });
    // Cria palpite para o jogo x de um bolão y #### OK #####
    fastify.post("/bolao/:bolao_id/jogos/:jogo_id/palpite", {
        onRequest: [authenticate_1.authenticate],
    }, async (request, reply) => {
        const createPalpiteParams = zod_1.z.object({
            bolao_id: zod_1.z.string(),
            jogo_id: zod_1.z.string(),
        });
        const createPalpiteBody = zod_1.z.object({
            golTimeCasa: zod_1.z.number(),
            golTimeFora: zod_1.z.number(),
        });
        const { bolao_id, jogo_id } = createPalpiteParams.parse(request.params);
        const { golTimeCasa, golTimeFora } = createPalpiteBody.parse(request.body);
        // verifica se o usuario faz parte do bolão
        const participante = await prisma_1.prisma.participante.findUnique({
            where: {
                usuario_id_bolao_id: {
                    bolao_id: parseInt(bolao_id),
                    usuario_id: parseInt(request.user.sub),
                },
            },
        });
        if (!participante) {
            return reply.status(400).send({
                message: "Você não tem permissão para criar um palpite nesse bolão.",
            });
        }
        // verifica se existe o jogoBolao com o id informado
        const jogoBolao = await prisma_1.prisma.jogo_bolao.findUnique({
            where: {
                jogo_id_bolao_id: {
                    bolao_id: parseInt(bolao_id),
                    jogo_id: parseInt(jogo_id),
                },
            },
            include: {
                jogo: true,
            },
        });
        if (!jogoBolao) {
            return reply.status(400).send({
                message: "Jogo não encontrado nesse bolão",
            });
        }
        //verifica se o jogo ja começou
        if (jogoBolao.jogo.data < new Date()) {
            return reply.status(400).send({
                message: "Você não pode enviar palpite após o começo do jogo.",
            });
        }
        //verifica se o usuário ja fez um palpite para esse jogo
        /*
      const palpite = await prisma.palpite.findUnique({
        where: {
          participante_id_jogoBolao_id: {
            participante_id: participante.id,
            jogoBolao_id: jogoBolao.id,
          }
        }
      })
  
      if (palpite) {
        return reply.status(400).send({
          message: "você já fez um palpite para esse jogo nesse bolão."
        })
      }
      */
        try {
            /*
          // cria o palpite
          await prisma.palpite.create({
            data: {
              jogoBolao_id: jogoBolao.id,
              participante_id: participante.id,
              golTimeCasa,
              golTimeFora,
            }
          })
          */
            await prisma_1.prisma.palpite.upsert({
                where: {
                    participante_id_jogoBolao_id: {
                        participante_id: participante.id,
                        jogoBolao_id: jogoBolao.id,
                    },
                },
                update: {
                    golTimeCasa,
                    golTimeFora,
                    updatedAt: new Date(),
                },
                create: {
                    jogoBolao_id: jogoBolao.id,
                    participante_id: participante.id,
                    golTimeCasa,
                    golTimeFora,
                },
            });
            return reply.status(201).send();
        }
        catch (error) {
            console.log("error");
            return reply.status(400).send({
                message: `Problema ao cadastrar palpite! -> ${error}`,
            });
        }
    });
    // retorna todos os palpites do jogo
    fastify.get("/bolao/:bolao_id/jogo/:jogo_id/palpites", {
        onRequest: [authenticate_1.authenticate],
    }, async (request, reply) => {
        const getBolaoParams = zod_1.z.object({
            bolao_id: zod_1.z.string(),
            jogo_id: zod_1.z.string(),
        });
        const { bolao_id } = getBolaoParams.parse(request.params);
        const { jogo_id } = getBolaoParams.parse(request.params);
        const bolao = await prisma_1.prisma.bolao.findFirst({
            where: {
                id: parseInt(bolao_id),
            },
        });
        if (!bolao) {
            return reply.status(400).send({
                message: "Bolão não existe",
            });
        }
        //if (bolao.donoBolaoId != parseInt(request.user.sub)) {
        //  return reply.status(400).send({
        //    message: "Apenas o dono do bolão tem permissão para visualizar os palpites"
        //  })
        //}
        const jogo_bolao = await prisma_1.prisma.jogo_bolao.findFirst({
            where: {
                AND: [
                    {
                        bolao_id: parseInt(bolao_id),
                    },
                    {
                        jogo_id: parseInt(jogo_id),
                    },
                ],
            },
        });
        if (!jogo_bolao) {
            return reply.status(400).send({
                message: "Jogo não cadastrado no bolão",
            });
        }
        try {
            const palpites = await prisma_1.prisma.palpite.findMany({
                where: {
                    jogoBolao_id: jogo_bolao.id,
                },
                select: {
                    id: true,
                    participante: {
                        select: {
                            usuario: {
                                select: {
                                    id: true,
                                    nome: true,
                                },
                            },
                        },
                    },
                    createdAt: true,
                    updatedAt: true,
                },
            });
            return { palpites };
        }
        catch (error) {
            return reply.status(400).send({
                message: "ERRO -> " + error,
            });
        }
    });
}
exports.palpiteRoutes = palpiteRoutes;
