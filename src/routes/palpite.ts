import { FastifyInstance } from "fastify"
import { date, z } from "zod";
import { prisma } from "../lib/prisma"
import { authenticate } from "../plugins/authenticate";

/*
  PONTUAÇÃO EXATA : 20 PONTOS
  ACERTOU O TIME VITORIOSO: 10 PONTOS
  ACERTOU QUE VAI DAR EMPATE: 10 PONTOS
*/

export async function palpiteRoutes(fastify: FastifyInstance) {

  fastify.get('/palpites/count', async () => {
    const count = await prisma.palpite.count()

    return { count }
  });

  // Cria palpite para o jogo x de um bolão y #### OK #####
  fastify.post('/bolao/:bolao_id/jogos/:jogo_id/palpite', {
    onRequest: [authenticate]
  }, async (request, reply) => {
    const createPalpiteParams = z.object({
      bolao_id: z.string(),
      jogo_id: z.string(),
    })

    const createPalpiteBody = z.object({
      golTimeCasa: z.number(),
      golTimeFora: z.number(),
    })

    const { bolao_id, jogo_id } = createPalpiteParams.parse(request.params)
    const { golTimeCasa, golTimeFora } = createPalpiteBody.parse(request.body)

    // verifica se o usupario faz parte do bolão
    const participante = await prisma.participante.findUnique({
      where: {
        usuario_id_bolao_id: {
          bolao_id: parseInt(bolao_id),
          usuario_id: parseInt(request.user.sub)
        }
      }
    })

    if (!participante) {
      return reply.status(400).send({
        message: "Você não tem permissão para criar um palpite nesse bolão."
      })
    }

    // verifica se existe o jogoBolao com o id informado
    const jogoBolao = await prisma.jogo_bolao.findUnique({
      where: {
        jogo_id_bolao_id: {
          bolao_id: parseInt(bolao_id),
          jogo_id: parseInt(jogo_id),
        }
      },
      include: {
        jogo: true
      }
    })

    if (!jogoBolao) {
      return reply.status(400).send({
        message: "Jogo não encontrado nesse bolão"
      })
    }

    //verifica se o jogo ja começou
    if (jogoBolao.jogo.data < new Date()) {
      return reply.status(400).send({
        message: "Você não pode enviar palpite após o começo do jogo."
      })
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
      await prisma.palpite.upsert({
        where: {
          participante_id_jogoBolao_id: {
            participante_id: participante.id,
            jogoBolao_id: jogoBolao.id,
          }
        },
        update: {
          golTimeCasa,
          golTimeFora,
        },
        create: {
          jogoBolao_id: jogoBolao.id,
          participante_id: participante.id,
          golTimeCasa,
          golTimeFora,
        }
      })


      return reply.status(201).send()

    } catch (error) {
      console.log('error')
      return reply.status(400).send({
        message: `Problema ao cadastrar palpite! -> ${error}`
      })
    }
  })

  // retorna todos os palpites do jogo
  fastify.get('/bolao/:bolao_id/jogo/:jogo_id/palpites', {
    onRequest: [authenticate]
  }, async (request, reply) => {

    const getBolaoParams = z.object({
      bolao_id: z.string(),
      jogo_id: z.string(),
    })

    const { bolao_id } = getBolaoParams.parse(request.params)
    const { jogo_id } = getBolaoParams.parse(request.params)

    const bolao = await prisma.bolao.findFirst({
      where: {
        id: parseInt(bolao_id)
      }
    })

    if (!bolao) {
      return reply.status(400).send({
        message: "Bolão não existe"
      })
    }

    //if (bolao.donoBolaoId != parseInt(request.user.sub)) {
    //  return reply.status(400).send({
    //    message: "Apenas o dono do bolão tem permissão para visualizar os palpites"
    //  })
    //}

    const jogo_bolao = await prisma.jogo_bolao.findFirst({
      where: {
        AND: [
          {
            bolao_id: parseInt(bolao_id)
          },
          {
            jogo_id: parseInt(jogo_id)
          }
        ]
      }
    })

    if (!jogo_bolao) {
      return reply.status(400).send({
        message: "Jogo não cadastrado no bolão"
      })
    }

    try {
      const palpites = await prisma.palpite.findMany({
        where: {
          jogoBolao_id: jogo_bolao.id
        },
        select: {
          id: true,
          participante: {
            select: {
              usuario: {
                select: {
                  id: true,
                  nome: true,
                }
              }
            },
          },
        }
      })

      return { palpites }

    } catch (error) {
      return reply.status(400).send({
        message: "ERRO -> " + error
      })
    }



  });
}
