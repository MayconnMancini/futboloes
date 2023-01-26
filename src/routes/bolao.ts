import { FastifyInstance } from "fastify"
import ShortUniqueId from "short-unique-id"
import { z } from "zod"
import { prisma } from "../lib/prisma"
import { authenticate } from "../plugins/authenticate"

export async function bolaoRoutes(fastify: FastifyInstance) {
  //### OK ###
  fastify.get('/bolao/count', async () => {
    const count = await prisma.bolao.count()

    return { count }
  })

  // rota para criar um bolão### OK ###
  fastify.post('/bolao', async (request, reply) => {

    // valida se o input é uma string
    const createBolaoBody = z.object({
      nome: z.string(),
    })

    const { nome } = createBolaoBody.parse(request.body)

    const generate = new ShortUniqueId({ length: 6 })
    const codigo = String(generate()).toUpperCase()

    try {

      // cria o bolão caso o usuario esteja logado
      await request.jwtVerify()

      // colocar verificação se o user é admin

      await prisma.bolao.create({
        data: {
          nome,
          codigo,
          donoBolaoId: parseInt(request.user.sub),

          // ja adiciona o criador do bolao como participante do bolão
          participantes: {
            create: {
              usuario_id: parseInt(request.user.sub),
            }
          }
        }
      })
    } catch (error) {

      console.log(error)

      return reply.status(400).send({
        message: "Você não tem permissão para criar um palpite nesse bolão."
      })

    }

    return reply.status(201).send({ codigo, nome })
  });

  // rota para entrar em um bolao ### OK ###
  fastify.post('/bolao/join', {
    // verifica se o usupario está logado
    onRequest: [authenticate]
  }, async (request, reply) => {

    const joinBolaoBody = z.object({
      codigo: z.string(),
    })

    const { codigo } = joinBolaoBody.parse(request.body)

    // valida se existe bolão com o ID informado e se ja está participando do bolao
    const bolao = await prisma.bolao.findUnique({
      where: {
        codigo,
      },
      include: {
        participantes: {
          where: {
            usuario_id: parseInt(request.user.sub),
          }
        }
      }
    })

    if (!bolao) {
      return reply.status(400).send({
        message: 'Bolão não encontrado.'
      })
    }

    if (bolao.participantes.length > 0) {
      return reply.status(400).send({
        message: 'Você já está participando deste bolão.'
      })
    }

    // se nao existir um dono do bolão, adiciona o primeiro usuário que entrou no bolao
    // Função deve ser removida pois sera obrigatorio estar logado para criar bolão
    if (!bolao.donoBolaoId) {
      await prisma.bolao.update({
        where: {
          id: bolao.id,
        },
        data: {
          donoBolaoId: parseInt(request.user.sub),
        }
      })
    }

    // variavel sub. variável que contem o id do usuário. È Obtido por meio do token
    await prisma.participante.create({
      data: {
        bolao_id: bolao.id,
        usuario_id: parseInt(request.user.sub)
      }
    })

    return reply.status(201).send()
  })

  fastify.get('/bolao/me', {
    onRequest: [authenticate]
  }, async (request) => {
    const bolao = await prisma.bolao.findMany({
      where: {
        participantes: {
          some: {
            usuario_id: parseInt(request.user.sub),
          }
        }
      },
    })

    return { bolao }
  })


  // lista bolões que o usuario participa ### OK ###
  fastify.get('/bolao', {
    onRequest: [authenticate]
  }, async (request) => {
    const bolao = await prisma.bolao.findMany({
      where: {
        participantes: {
          some: {
            usuario_id: parseInt(request.user.sub),
          }
        }
      },
      include: {
        _count: {
          select: {
            participantes: true,
          }
        },
        participantes: {
          select: {
            id: true,
            usuario: {
              select: {
                id: true,
                nome: true,
                avatarUrl: true,
              }
            }
          },
          take: 4,
        },
        donoBolao: {
          select: {
            id: true,
            nome: true,
          }
        }
      }
    })

    return { bolao }
  })

  // buscar bolão por ID ### OK ###
  fastify.get('/bolao/:id', {
    onRequest: [authenticate]
  }, async (request) => {
    const getBolaoParams = z.object({
      id: z.string(),
    })

    const { id } = getBolaoParams.parse(request.params)

    const bolao = await prisma.bolao.findUnique({
      where: {
        id: parseInt(id)
      },
      include: {
        _count: {
          select: {
            participantes: true,
          }
        },
        participantes: {
          select: {
            id: true,
            usuario: {
              select: {
                id: true,
                nome: true,
                avatarUrl: true,
              }
            }
          },
          take: 4,
        },
        donoBolao: {
          select: {
            id: true,
            nome: true,
          }
        }
      }
    })

    return { bolao }
  })
  /*
    // buscar bolão por ID e retorna todos os participantes
    fastify.get('/bolao/:id/participantes', {
      onRequest: [authenticate]
    }, async (request) => {
      const getBolaoParams = z.object({
        id: z.string(),
      })
  
      const { id } = getBolaoParams.parse(request.params)
  
      return await prisma.bolao.findUnique({
        where: {
          id: parseInt(id)
        },
        include: {
          _count: {
            select: {
              participantes: true,
            }
          },
          participantes: {
            select: {
              id: true,
              usuario: {
                select: {
                  id: true,
                  nome: true,
                  avatarUrl: true,
                }
              }
            },
          },
          donoBolao: {
            select: {
              id: true,
              nome: true,
            }
          }
        }
      })
    })
  */

  // buscar bolão por ID e retorna todos os participantes
  fastify.get('/bolao/:id/participantes', {
    onRequest: [authenticate]
  }, async (request) => {
    const getBolaoParams = z.object({
      id: z.string(),
    })

    const { id } = getBolaoParams.parse(request.params)

    return await prisma.participante.findMany({
      where: {
        bolao_id: Number(id)
      },
      select: {
        id: true,
        usuario: {
          select: {
            id: true,
            nome: true,
            avatarUrl: true,
          }
        },
      }
    })
  })


  // rota para cadastrar jogo ao bolão 
  fastify.post('/bolao/jogo/add', {
    // verifica se o usupario está logado
    onRequest: [authenticate]
  }, async (request, reply) => {

    // VERIFICAR SE O USUÁRIO É ADMIN (TO-DO)

    const addJogoInBolaoBody = z.object({
      id_bolao: z.string(),
      fixtureIdApi: z.string(),
      data: z.string(),
      timeCasa: z.string(),
      timeFora: z.string(),
      competicao: z.string(),
      logoTimeCasa: z.string(),
      logoTimeFora: z.string(),
      country: z.string(),
      logo: z.string(),
      flag: z.string(),
      statusJogo: z.string(),
    })

    const { id_bolao, fixtureIdApi, data, timeCasa, timeFora, competicao, logoTimeCasa, logoTimeFora,
      country, logo, flag, statusJogo

    } = addJogoInBolaoBody.parse(request.body)


    // verifica se o jogo ja começou
    if (new Date(data) <= new Date()) {
      return reply.status(400).send({
        message: 'Jogo já iniciado.'
      })
    }

    // valida se existe bolão com o ID informado e se ja está participando do bolao
    const bolao = await prisma.bolao.findUnique({
      where: {
        id: Number(id_bolao),
      },
    })

    if (!bolao) {
      return reply.status(400).send({
        message: 'Bolão não encontrado.'
      })
    }

    //verifica se quem fez a request é o dono do bolão
    if (bolao.donoBolaoId != parseInt(request.user.sub)) {
      return reply.status(400).send({
        message: 'Apenas o criador do bolão é autorizado a adicionar jogos'
      })
    }

    // verifica se o jogo ja foi cadastrado
    let jogo = await prisma.jogo.findFirst({
      where: {
        AND: [
          {
            data: data
          },
          {
            timeCasa: timeCasa
          },
          {
            timeFora: timeFora
          }
        ]
      },
    })

    if (!jogo) {
      // cadastra jogo no bd
      jogo = await prisma.jogo.create({
        data: {
          data: new Date(data),
          timeCasa,
          timeFora,
          competicao,
          logoTimeCasa,
          logoTimeFora,
          fixtureIdApi: Number(fixtureIdApi),
          country,
          logo,
          flag,
          statusJogo
        }
      })
    }

    let jogo_bolao = await prisma.jogo_bolao.findFirst({
      where: {
        AND: [
          {
            jogo_id: jogo.id
          },
          {
            bolao_id: Number(id_bolao)
          }
        ]
      }
    })

    if (jogo_bolao) {
      return reply.status(400).send({
        message: 'Jogo já cadastrado nesse bolão'
      })
    }

    try {
      // adiciona jogo ao bolão
      await prisma.jogo_bolao.create({
        data: {
          jogo_id: jogo.id,
          bolao_id: Number(id_bolao),
        }
      })

      return reply.status(201).send()
    } catch (error) {

      console.log(error)

      return reply.status(400).send({
        message: "Erro ao cadastrar jogo."
      })

    }
  })


  // deleta um participande cadastrado no bolão
  fastify.delete('/bolao/:bolao_id/participante/:usuario_id', {
    onRequest: [authenticate]
  }, async (request, reply) => {

    const getBolaoParams = z.object({
      bolao_id: z.string(),
      usuario_id: z.string(),
    })

    const { bolao_id } = getBolaoParams.parse(request.params)
    const { usuario_id } = getBolaoParams.parse(request.params)

    const bolao = await prisma.bolao.findFirst({
      where: {
        AND: [
          {
            id: Number(bolao_id)
          },
          {
            donoBolaoId: parseInt(request.user.sub)
          },
        ]
      },
    })

    if (!bolao) {
      return reply.status(400).send({
        message: "Você não tem permissão para excluir um participante do bolão."
      })
    }

    const participante = await prisma.participante.findFirst({
      where: {
        bolao_id: Number(bolao_id),
        usuario_id: Number(usuario_id)
      },
    })

    console.log("PARTICIPANTE ++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
    console.log(participante);

    if (!participante) {
      return reply.status(400).send({
        message: "Participante não cadastrado nesse bolao!"
      })
    }

    if (participante.usuario_id === bolao.donoBolaoId) {
      return reply.status(400).send({
        message: "O dono do bolão não pode ser excluído do grupo"
      })
    }

    const deletePalpite = prisma.palpite.deleteMany({
      where: {
        participante_id: participante.id
      },
    })

    const deleteParticipante = prisma.participante.delete({
      where: {
        id: participante.id
      },
    })

    await prisma.$transaction([deletePalpite, deleteParticipante])

    return reply.status(202).send()

  });

}

