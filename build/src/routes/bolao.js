"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bolaoRoutes = void 0;
const short_unique_id_1 = __importDefault(require("short-unique-id"));
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const authenticate_1 = require("../plugins/authenticate");
async function bolaoRoutes(fastify) {
    //### OK ###
    fastify.get('/bolao/count', async () => {
        const count = await prisma_1.prisma.bolao.count();
        return { count };
    });
    // rota para criar um bolão### OK ###
    fastify.post('/bolao', async (request, reply) => {
        // valida se o input é uma string
        const createBolaoBody = zod_1.z.object({
            nome: zod_1.z.string(),
        });
        const { nome } = createBolaoBody.parse(request.body);
        const generate = new short_unique_id_1.default({ length: 6 });
        const codigo = String(generate()).toUpperCase();
        try {
            // cria o bolão caso o usuario esteja logado
            await request.jwtVerify();
            // colocar verificação se o user é admin
            await prisma_1.prisma.bolao.create({
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
            });
        }
        catch (error) {
            console.log(error);
            return reply.status(400).send({
                message: "Você não tem permissão para criar um palpite nesse bolão."
            });
        }
        return reply.status(201).send({ codigo, nome });
    });
    // buscar bolão por ID e retorna todos as pendencias
    fastify.get('/bolao/:id/pendencias', {
        onRequest: [authenticate_1.authenticate]
    }, async (request) => {
        const getBolaoParams = zod_1.z.object({
            id: zod_1.z.string(),
        });
        const { id } = getBolaoParams.parse(request.params);
        return await prisma_1.prisma.pendencias.findMany({
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
        });
    });
    // rota para entrar em um bolao ( CADASTRA NA TABELA DE PENDENCIAS)
    fastify.post('/bolao/join/pendencias', {
        // verifica se o usupario está logado
        onRequest: [authenticate_1.authenticate]
    }, async (request, reply) => {
        const joinBolaoBody = zod_1.z.object({
            codigo: zod_1.z.string(),
        });
        const { codigo } = joinBolaoBody.parse(request.body);
        // valida se existe bolão com o ID informado e se ja está participando do bolao
        const bolao = await prisma_1.prisma.bolao.findUnique({
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
        });
        if (!bolao) {
            return reply.status(400).send({
                message: 'Bolão não encontrado.'
            });
        }
        if (bolao.participantes.length > 0) {
            return reply.status(400).send({
                message: 'Você já está participando deste bolão.'
            });
        }
        const pendecia = await prisma_1.prisma.pendencias.findFirst({
            where: {
                AND: [
                    {
                        usuario_id: Number(request.user.sub),
                    },
                    {
                        bolao_id: bolao.id,
                    }
                ]
            }
        });
        if (pendecia) {
            return reply.status(400).send({
                message: 'Você ja enviou solicitação para esse bolão. Entre em contato com o ADM para pedir a aprovação'
            });
        }
        // variavel sub. variável que contem o id do usuário. È Obtido por meio do token
        await prisma_1.prisma.pendencias.create({
            data: {
                bolao_id: bolao.id,
                usuario_id: parseInt(request.user.sub)
            }
        });
        return reply.status(201).send();
    });
    // rota para aprovar participante ( CADASTRA NA TABELA DE participante)
    fastify.post('/bolao/join/pendencias/aprovar', {
        // verifica se o usupario está logado
        onRequest: [authenticate_1.authenticate]
    }, async (request, reply) => {
        const joinBolaoBody = zod_1.z.object({
            id_usuario: zod_1.z.string(),
            id_bolao: zod_1.z.string()
        });
        const { id_usuario, id_bolao } = joinBolaoBody.parse(request.body);
        // valida se existe bolão com o ID informado e se ja está participando do bolao
        const bolao = await prisma_1.prisma.bolao.findUnique({
            where: {
                id: Number(id_bolao),
            },
            include: {
                participantes: {
                    where: {
                        usuario_id: Number(id_usuario),
                    }
                }
            }
        });
        if (!bolao) {
            return reply.status(400).send({
                message: 'Bolão não encontrado.'
            });
        }
        if (bolao.participantes.length > 0) {
            return reply.status(400).send({
                message: 'Usuário já está participando deste bolão.'
            });
        }
        if (bolao.donoBolaoId != parseInt(request.user.sub)) {
            return reply.status(400).send({
                message: 'Apenas o dono do bolão pode aprovar participantes.'
            });
        }
        // se for o dono do bolão, aprova a solicitação
        if (bolao.donoBolaoId == parseInt(request.user.sub)) {
            try {
                // variavel sub. variável que contem o id do usuário. È Obtido por meio do token
                const createParticipante = prisma_1.prisma.participante.create({
                    data: {
                        bolao_id: bolao.id,
                        usuario_id: Number(id_usuario)
                    }
                });
                const deletePendencia = prisma_1.prisma.pendencias.deleteMany({
                    where: {
                        AND: [
                            {
                                usuario_id: Number(id_usuario),
                            },
                            {
                                bolao_id: Number(id_bolao),
                            }
                        ]
                    },
                });
                await prisma_1.prisma.$transaction([createParticipante, deletePendencia]);
                return reply.status(201).send();
            }
            catch (error) {
                return reply.status(400).send({
                    message: error
                });
            }
        }
        return reply.status(400).send({
            message: "Algo deu errado"
        });
    });
    // rota para reprovar participante ( REMOVE DA TABELA DE PENDENCIAS)
    fastify.post('/bolao/join/pendencias/reprovar', {
        // verifica se o usupario está logado
        onRequest: [authenticate_1.authenticate]
    }, async (request, reply) => {
        const joinBolaoBody = zod_1.z.object({
            id_usuario: zod_1.z.string(),
            id_bolao: zod_1.z.string()
        });
        const { id_usuario, id_bolao } = joinBolaoBody.parse(request.body);
        // valida se existe bolão com o ID informado e se ja está participando do bolao
        const bolao = await prisma_1.prisma.bolao.findUnique({
            where: {
                id: Number(id_bolao),
            },
            include: {
                participantes: {
                    where: {
                        usuario_id: Number(id_usuario),
                    }
                }
            }
        });
        if (!bolao) {
            return reply.status(400).send({
                message: 'Bolão não encontrado.'
            });
        }
        if (bolao.participantes.length > 0) {
            return reply.status(400).send({
                message: 'Usuário já está participando deste bolão.'
            });
        }
        if (bolao.donoBolaoId != parseInt(request.user.sub)) {
            return reply.status(400).send({
                message: 'Apenas o dono do bolão pode reprovar participantes.'
            });
        }
        // se for o dono do bolão, aprova a solicitação
        if (bolao.donoBolaoId == parseInt(request.user.sub)) {
            try {
                await prisma_1.prisma.pendencias.deleteMany({
                    where: {
                        AND: [
                            {
                                usuario_id: Number(id_usuario),
                            },
                            {
                                bolao_id: Number(id_bolao),
                            }
                        ]
                    },
                });
                return reply.status(201).send();
            }
            catch (error) {
                return reply.status(400).send({
                    message: error
                });
            }
        }
        return reply.status(400).send({
            message: "Algo deu errado"
        });
    });
    // rota para entrar em um bolao ### OK ### (APAGAR FUNÇÃO DEPOIS DOS TESTE)
    fastify.post('/bolao/join', {
        // verifica se o usupario está logado
        onRequest: [authenticate_1.authenticate]
    }, async (request, reply) => {
        const joinBolaoBody = zod_1.z.object({
            codigo: zod_1.z.string(),
        });
        const { codigo } = joinBolaoBody.parse(request.body);
        // valida se existe bolão com o ID informado e se ja está participando do bolao
        const bolao = await prisma_1.prisma.bolao.findUnique({
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
        });
        if (!bolao) {
            return reply.status(400).send({
                message: 'Bolão não encontrado.'
            });
        }
        if (bolao.participantes.length > 0) {
            return reply.status(400).send({
                message: 'Você já está participando deste bolão.'
            });
        }
        // se nao existir um dono do bolão, adiciona o primeiro usuário que entrou no bolao
        // Função deve ser removida pois sera obrigatorio estar logado para criar bolão
        if (!bolao.donoBolaoId) {
            await prisma_1.prisma.bolao.update({
                where: {
                    id: bolao.id,
                },
                data: {
                    donoBolaoId: parseInt(request.user.sub),
                }
            });
        }
        // variavel sub. variável que contem o id do usuário. È Obtido por meio do token
        await prisma_1.prisma.participante.create({
            data: {
                bolao_id: bolao.id,
                usuario_id: parseInt(request.user.sub)
            }
        });
        return reply.status(201).send();
    });
    fastify.get('/bolao/me', {
        onRequest: [authenticate_1.authenticate]
    }, async (request) => {
        const bolao = await prisma_1.prisma.bolao.findMany({
            where: {
                participantes: {
                    some: {
                        usuario_id: parseInt(request.user.sub),
                    }
                }
            },
        });
        return { bolao };
    });
    // pendencias para entrar no bolão do usuário
    fastify.get('/pendencias/me', {
        onRequest: [authenticate_1.authenticate]
    }, async (request) => {
        const pendencias = await prisma_1.prisma.pendencias.findMany({
            where: {
                usuario_id: parseInt(request.user.sub)
            },
            include: {
                bolao: {
                    select: {
                        nome: true,
                        codigo: true,
                    }
                }
            }
        });
        console.log(pendencias);
        return { pendencias };
    });
    // lista bolões que o usuario participa ### OK ###
    fastify.get('/bolao', {
        onRequest: [authenticate_1.authenticate]
    }, async (request) => {
        const bolao = await prisma_1.prisma.bolao.findMany({
            where: {
                participantes: {
                    some: {
                        usuario_id: parseInt(request.user.sub),
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
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
        });
        return { bolao };
    });
    // buscar bolão por ID ### OK ###
    fastify.get('/bolao/:id', {
        onRequest: [authenticate_1.authenticate]
    }, async (request) => {
        const getBolaoParams = zod_1.z.object({
            id: zod_1.z.string(),
        });
        const { id } = getBolaoParams.parse(request.params);
        const bolao = await prisma_1.prisma.bolao.findUnique({
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
        });
        return { bolao };
    });
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
        onRequest: [authenticate_1.authenticate]
    }, async (request) => {
        const getBolaoParams = zod_1.z.object({
            id: zod_1.z.string(),
        });
        const { id } = getBolaoParams.parse(request.params);
        return await prisma_1.prisma.participante.findMany({
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
        });
    });
    // rota para cadastrar jogo ao bolão 
    fastify.post('/bolao/jogo/add', {
        // verifica se o usupario está logado
        onRequest: [authenticate_1.authenticate]
    }, async (request, reply) => {
        // VERIFICAR SE O USUÁRIO É ADMIN (TO-DO)
        const addJogoInBolaoBody = zod_1.z.object({
            id_bolao: zod_1.z.string(),
            fixtureIdApi: zod_1.z.string(),
            data: zod_1.z.string(),
            timeCasa: zod_1.z.string(),
            timeFora: zod_1.z.string(),
            competicao: zod_1.z.string(),
            logoTimeCasa: zod_1.z.string(),
            logoTimeFora: zod_1.z.string(),
            country: zod_1.z.string(),
            logo: zod_1.z.string(),
            flag: zod_1.z.string(),
            statusJogo: zod_1.z.string(),
        });
        const { id_bolao, fixtureIdApi, data, timeCasa, timeFora, competicao, logoTimeCasa, logoTimeFora, country, logo, flag, statusJogo } = addJogoInBolaoBody.parse(request.body);
        // verifica se o jogo ja começou
        if (new Date(data) <= new Date()) {
            return reply.status(400).send({
                message: 'Jogo já iniciado.'
            });
        }
        // valida se existe bolão com o ID informado e se ja está participando do bolao
        const bolao = await prisma_1.prisma.bolao.findUnique({
            where: {
                id: Number(id_bolao),
            },
        });
        if (!bolao) {
            return reply.status(400).send({
                message: 'Bolão não encontrado.'
            });
        }
        //verifica se quem fez a request é o dono do bolão
        if (bolao.donoBolaoId != parseInt(request.user.sub)) {
            return reply.status(400).send({
                message: 'Apenas o criador do bolão é autorizado a adicionar jogos'
            });
        }
        // verifica se o jogo ja foi cadastrado
        let jogo = await prisma_1.prisma.jogo.findFirst({
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
        });
        if (!jogo) {
            // cadastra jogo no bd
            jogo = await prisma_1.prisma.jogo.create({
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
            });
        }
        let jogo_bolao = await prisma_1.prisma.jogo_bolao.findFirst({
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
        });
        if (jogo_bolao) {
            return reply.status(400).send({
                message: 'Jogo já cadastrado nesse bolão'
            });
        }
        try {
            // adiciona jogo ao bolão
            await prisma_1.prisma.jogo_bolao.create({
                data: {
                    jogo_id: jogo.id,
                    bolao_id: Number(id_bolao),
                }
            });
            return reply.status(201).send();
        }
        catch (error) {
            console.log(error);
            return reply.status(400).send({
                message: "Erro ao cadastrar jogo."
            });
        }
    });
    // deleta um participande cadastrado no bolão
    fastify.delete('/bolao/:bolao_id/participante/:usuario_id', {
        onRequest: [authenticate_1.authenticate]
    }, async (request, reply) => {
        const getBolaoParams = zod_1.z.object({
            bolao_id: zod_1.z.string(),
            usuario_id: zod_1.z.string(),
        });
        const { bolao_id } = getBolaoParams.parse(request.params);
        const { usuario_id } = getBolaoParams.parse(request.params);
        const bolao = await prisma_1.prisma.bolao.findFirst({
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
        });
        if (!bolao) {
            return reply.status(400).send({
                message: "Você não tem permissão para excluir um participante do bolão."
            });
        }
        const participante = await prisma_1.prisma.participante.findFirst({
            where: {
                bolao_id: Number(bolao_id),
                usuario_id: Number(usuario_id)
            },
        });
        console.log("PARTICIPANTE ++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
        console.log(participante);
        if (!participante) {
            return reply.status(400).send({
                message: "Participante não cadastrado nesse bolao!"
            });
        }
        if (participante.usuario_id === bolao.donoBolaoId) {
            return reply.status(400).send({
                message: "O dono do bolão não pode ser excluído do grupo"
            });
        }
        const deletePalpite = prisma_1.prisma.palpite.deleteMany({
            where: {
                participante_id: participante.id
            },
        });
        const deleteParticipante = prisma_1.prisma.participante.delete({
            where: {
                id: participante.id
            },
        });
        await prisma_1.prisma.$transaction([deletePalpite, deleteParticipante]);
        return reply.status(202).send();
    });
}
exports.bolaoRoutes = bolaoRoutes;
