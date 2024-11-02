"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jogoRoutes = void 0;
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const authenticate_1 = require("../plugins/authenticate");
const dayjs_1 = __importDefault(require("dayjs"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
//const timezone = require("dayjs/plugin/timezone");
//const unique = require("dayjs/plugin/unique");
const axios_1 = __importDefault(require("axios"));
/*
  PONTUAÇÃO EXATA : 21 PONTOS
  ACERTOU O TIME VITORIOSO: 10 PONTOS
  ACERTOU QUE VAI DAR EMPATE: 10 PONTOS
*/
async function formataDataUTC4(data) {
    dayjs_1.default.extend(utc_1.default);
    // Crie a data inicial em UTC
    const dateInicial = dayjs_1.default.utc(data);
    // Adicione um deslocamento de +4 horas
    const dateInicialComUTC4 = dateInicial.add(4, "hour");
    // Crie a data final adicionando 1 dia em UTC
    const dateFinal = dateInicial.add(1, "day");
    // Adicione um deslocamento de +4 horas
    const dateFinalComUTC4 = dateFinal.add(4, "hour");
    return {
        dataInicial: dateInicialComUTC4,
        dataFinal: dateFinalComUTC4,
    };
}
async function jogoRoutes(fastify) {
    /*
    //atualiza a pontuação dos palpites
    fastify.get('/jogos/palpites', {
      onRequest: [authenticate]
    }, async (request) => {
  
      // busca todos os palpites dos bolões
      const palpites = await prisma.palpite.findMany()
      console.log(palpites)
  
      // calcula a pontuação dos palputes
      palpites.map(async (item) => {
        // para cada palpite retorna os dados do jogo
        let jogo = await prisma.jogo.findFirst({
          where: {
            Jogos_boloes: {
              some: {
                id: item.jogoBolao_id
              }
            }
          }
        })
  
        // verifica se o jogo tem resultado definido
        if (jogo?.resultGolTimeCasa != null && jogo?.resultGolTimeFora != null) {
          // se acertou o placar exato
          if (item.golTimeCasa === jogo.resultGolTimeCasa && item.golTimeFora === jogo.resultGolTimeFora) {
            await prisma.palpite.update({
              where: {
                id: item.id
              },
              data: {
                pontuacao: 20
              }
            })
          } else {
            // verifica se o palpite foi de vitória casa, fora ou empate
            let controlePalpite
            item.golTimeCasa > item.golTimeFora ? controlePalpite = "CASA" : item.golTimeCasa < item.golTimeFora ? controlePalpite = "FORA" : controlePalpite = "EMPATE"
  
            // verifica se o placar foi de vitoria casa, fora ou empate
            let controleResultadoJogo
            item.golTimeCasa > item.golTimeFora ? controleResultadoJogo = "CASA" : item.golTimeCasa < item.golTimeFora ? controleResultadoJogo = "FORA" : controleResultadoJogo = "EMPATE"
  
            // compara se acertou o vencedor/empate
            if (controlePalpite === controleResultadoJogo) {
  
              await prisma.palpite.update({
                where: {
                  id: item.id
                },
                data: {
                  pontuacao: 10
                }
              })
            }
          }
        }
      })
      return { message: "sucesso" };
    });
  */
    // retorna jogos cadastrados no bolão e a informação dos palpites do usuário V2 por data
    fastify.get("/v2/bolao/:id/rodadas", {
        onRequest: [authenticate_1.authenticate],
    }, async (request) => {
        const getBolaoParams = zod_1.z.object({
            id: zod_1.z.string(),
        });
        const { id } = getBolaoParams.parse(request.params);
        const jogos_bolao = await prisma_1.prisma.jogo_bolao.findMany({
            where: {
                bolao_id: parseInt(id),
            },
            orderBy: {
                jogo: {
                    data: "asc",
                },
            },
            include: {
                jogo: {
                    select: {
                        data: true,
                        timeCasa: true,
                        timeFora: true,
                    },
                },
            },
        });
        //return { jogos_bolao }
        const rodadas = jogos_bolao.map((jogo) => {
            return jogo.jogo.data;
        });
        dayjs_1.default.extend(utc_1.default);
        const datesUTC4 = rodadas.map((date) => convertToUTC4(date));
        const uniqueDatesUTC4 = [
            ...new Set(datesUTC4.map((date) => date.split("T")[0])),
        ];
        const Rodadas = uniqueDatesUTC4.map((date, index) => {
            return { rodada: index + 1, data: date };
        });
        return {
            data: Rodadas,
        };
        // retorna apenas um palpite por usuario
    });
    // Função para converter data de UTC para UTC+4
    const convertToUTC4 = (date) => {
        return dayjs_1.default.utc(date).add(-4, "hour").format();
    };
    // retorna jogos cadastrados no bolão e a informação dos palpites do usuário V2 por data
    fastify.get("/v2/bolao/:id/jogos/:data/palpites", {
        onRequest: [authenticate_1.authenticate],
    }, async (request) => {
        const getBolaoParams = zod_1.z.object({
            id: zod_1.z.string(),
            data: zod_1.z.string(),
        });
        const { id, data } = getBolaoParams.parse(request.params);
        const datasFomatada = await formataDataUTC4(data);
        const jogos_bolao = await prisma_1.prisma.jogo_bolao.findMany({
            where: {
                bolao_id: parseInt(id),
                jogo: {
                    AND: [
                        {
                            data: {
                                gte: datasFomatada.dataInicial.format(),
                            },
                        },
                        {
                            data: {
                                lt: datasFomatada.dataFinal.format(),
                            },
                        },
                    ],
                },
            },
            orderBy: {
                jogo: {
                    data: "asc",
                },
            },
            include: {
                jogo: true,
                palpites: {
                    where: {
                        participante: {
                            usuario_id: parseInt(request.user.sub),
                        },
                    },
                },
            },
        });
        //return { jogos_bolao }
        // retorna apenas um palpite por usuario
        return {
            jogos_bolao: jogos_bolao.map((jogo) => {
                return {
                    ...jogo,
                    palpite: jogo.palpites.length > 0 ? jogo.palpites[0] : null,
                    palpites: undefined,
                };
            }),
        };
    });
    // retorna todos jogos cadastrados no bolão e a informação dos palpites do usuário
    fastify.get("/bolao/:id/jogos/palpites", {
        onRequest: [authenticate_1.authenticate],
    }, async (request) => {
        const getBolaoParams = zod_1.z.object({
            id: zod_1.z.string(),
        });
        const { id } = getBolaoParams.parse(request.params);
        const jogos_bolao = await prisma_1.prisma.jogo_bolao.findMany({
            where: {
                bolao_id: parseInt(id),
            },
            orderBy: {
                jogo: {
                    data: "asc",
                },
            },
            include: {
                jogo: true,
                palpites: {
                    where: {
                        participante: {
                            usuario_id: parseInt(request.user.sub),
                        },
                    },
                },
            },
        });
        //return { jogos_bolao }
        // retorna apenas um palpite por usuario
        return {
            jogos_bolao: jogos_bolao.map((jogo) => {
                return {
                    ...jogo,
                    palpite: jogo.palpites.length > 0 ? jogo.palpites[0] : null,
                    palpites: undefined,
                };
            }),
        };
    });
    // deleta um jogo cadastrado no bolão
    fastify.delete("/bolao/:bolao_id/jogo/:jogo_id", {
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
                AND: [
                    {
                        id: Number(bolao_id),
                    },
                    {
                        donoBolaoId: parseInt(request.user.sub),
                    },
                ],
            },
        });
        if (!bolao) {
            return reply.status(400).send({
                message: "Você não tem permissão para excluir um jogo do bolão.",
            });
        }
        const jogo_bolao = await prisma_1.prisma.jogo_bolao.findFirst({
            where: {
                bolao_id: Number(bolao_id),
                jogo_id: Number(jogo_id),
            },
        });
        if (!jogo_bolao) {
            return reply.status(400).send({
                message: "Jogo não cadastrado nesse bolao!",
            });
        }
        const deletePalpite = prisma_1.prisma.palpite.deleteMany({
            where: {
                jogoBolao_id: jogo_bolao?.id,
            },
        });
        const deleteJogoBolao = prisma_1.prisma.jogo_bolao.delete({
            where: {
                id: jogo_bolao.id,
            },
        });
        await prisma_1.prisma.$transaction([deletePalpite, deleteJogoBolao]);
        return reply.status(202).send();
    });
    // retorna todos jogos cadastrados no bolão
    fastify.get("/bolao/:id/jogos", {
        onRequest: [authenticate_1.authenticate],
    }, async (request) => {
        const getBolaoParams = zod_1.z.object({
            id: zod_1.z.string(),
        });
        const { id } = getBolaoParams.parse(request.params);
        const jogos_bolao = await prisma_1.prisma.jogo_bolao.findMany({
            where: {
                bolao_id: parseInt(id),
            },
            orderBy: {
                jogo: {
                    data: "asc",
                },
            },
            include: {
                jogo: true,
            },
        });
        return jogos_bolao.map((jogo) => {
            return {
                ...jogo,
            };
        });
    });
    // retorna a contagem de jogos cadastrados no bolão
    fastify.get("/bolao/:id/jogos/count", {
        onRequest: [authenticate_1.authenticate],
    }, async (request) => {
        const getBolaoParams = zod_1.z.object({
            id: zod_1.z.string(),
        });
        const { id } = getBolaoParams.parse(request.params);
        const jogos_bolao = await prisma_1.prisma.jogo_bolao.count({
            where: {
                bolao_id: parseInt(id),
            },
        });
        return jogos_bolao;
    });
    //retorna todos os jogos cadastrado no sistema
    fastify.get("/jogos", {
        onRequest: [authenticate_1.authenticate],
    }, async (request) => {
        const jogos = await prisma_1.prisma.jogo.findMany();
        return jogos;
    });
    // retorna todos jogos cadastrados no bolão e a informação dos palpites do usuário
    fastify.get("/bolao/:id/jogos/old", {
        onRequest: [authenticate_1.authenticate],
    }, async (request) => {
        const getBolaoParams = zod_1.z.object({
            id: zod_1.z.string(),
        });
        const { id } = getBolaoParams.parse(request.params);
        const jogos_bolao = await prisma_1.prisma.jogo_bolao.findMany({
            where: {
                bolao_id: parseInt(id),
            },
            include: {
                jogo: true,
            },
        });
        return { jogos_bolao };
    });
    //retorna todos os jogos conforme data (API)
    fastify.get("/jogos/:datas", {
        onRequest: [authenticate_1.authenticate],
    }, async (request) => {
        const getBolaoParams = zod_1.z.object({
            datas: zod_1.z.string(),
        });
        const { datas } = getBolaoParams.parse(request.params);
        try {
            const { data } = await (0, axios_1.default)(`https://v3.football.api-sports.io/fixtures?date=${datas}&timezone=America/Cuiaba`, {
                method: "GET",
                headers: {
                    "x-apisports-key": process.env.X_APISPORTS_KEY,
                    "x-apisports-host": process.env.X_APISPORTS_HOST,
                },
            });
            // salva os dados da resposta do google
            //const jogosData = await jogosResponse.json()
            console.log("############  RESPOSTA ##############");
            //console.log(data.get);
            const resp = data["response"];
            console.log("############  CONVERSÃO ##############");
            //console.log(resp);
            /*
                console.log("############  REST MAP ##############");
                let final = resp.map(function (item: any) {
                  return (item.league.name);
                });
          
                console.log("############  REST ##############");
                //console.log(rest)
          
          let tt = resp.filter(function (item: any) {
    
            if (item.league.id === 39) {
              return { ...resp }
            }
          });
    
          console.log("############  FILTRO ##############");
          console.log(tt)
    
    
          console.log("############  ORDENAÇÃO POR ID (CRESCENTE) ##############");
          const sortedCars = resp.sort((c1: any, c2: any) => (c1.league.id > c2.league.id) ? 1 : (c1.league.id < c2.league.id) ? -1 : 0);
          console.log(sortedCars);
    
    
    
          JSON.stringify(sortedCars, null, 2);
    */
            return resp.sort((c1, c2) => c1.league.id > c2.league.id ? 1 : c1.league.id < c2.league.id ? -1 : 0);
        }
        catch (error) {
            console.log(error);
        }
    });
    //atualiza resultados Dos jogos (API)
    fastify.get("/jogos/:datas/updateJogos", {
        onRequest: [authenticate_1.authenticate],
    }, async (request, reply) => {
        const getBolaoParams = zod_1.z.object({
            datas: zod_1.z.string(),
        });
        const { datas } = getBolaoParams.parse(request.params);
        let originalDate = datas;
        try {
            dayjs_1.default.extend(utc_1.default);
            // datas no banco de dados são salvas em formato UTC. Entao deve-se usar essa estrategia para retornar
            // os jogos do dia conforme localtime do usuário.
            //Exemplo: Buscar jogo do dia 2023-01-12. Se fosse buscar UTC seria 2023-01-12T00:00 2023-01-12T23:59,
            // Porém se tiver um jogo as 22h local do usuário, no BD esse jogo estaria salvo no dia 13, com isso não iria
            // aparecer no retorno da busca. Por isso deve se adotar o exemplo abaixo.
            // busca jogos na data fornecida. Ele faz o intervalo entre a data fornecida + date UTC (+4)
            // + 1 dia.
            //jogos do dia 2023-01-12. Converte para (maior ou igual à) 2023-01-12+04:00 e (menor que) 2023-01-13T04:00 == 2023-01-12T04:00 à 2023-01-13T03:59
            //
            // Crie a data inicial em UTC
            const dateInicial = dayjs_1.default.utc(datas);
            console.log("DATE INICIAL (UTC) -> ", dateInicial.format());
            // Adicione um deslocamento de +4 horas
            const dateInicialComUTC4 = dateInicial.add(4, "hour");
            console.log("DATE INICIAL (UTC+4) -> ", dateInicialComUTC4.format());
            // Crie a data final adicionando 1 dia em UTC
            const dateFinal = dateInicial.add(1, "day");
            console.log("DATE FINAL (UTC) -> ", dateFinal.format());
            // Adicione um deslocamento de +4 horas
            const dateFinalComUTC4 = dateFinal.add(4, "hour");
            console.log("DATE FINAL (UTC+4) -> ", dateFinalComUTC4.format());
            const jogosBD = await prisma_1.prisma.jogo.findMany({
                where: {
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
            });
            console.log("jogos bd", jogosBD.length);
            if (jogosBD?.length > 0) {
                const { data } = await (0, axios_1.default)(`https://v3.football.api-sports.io/fixtures?date=${datas}&timezone=America/Cuiaba`, {
                    method: "GET",
                    headers: {
                        "x-apisports-key": process.env.X_APISPORTS_KEY,
                        "x-apisports-host": process.env.X_APISPORTS_HOST,
                    },
                });
                const resp = data["response"];
                const updatejogos = jogosBD.map(async (item) => {
                    const matchingResponse = resp.find((r) => item.fixtureIdApi === r.fixture.id &&
                        r.fixture.status.elapsed >= 90);
                    if (matchingResponse) {
                        console.log("ID encontrado ->");
                        await prisma_1.prisma.jogo.update({
                            where: {
                                id: item.id,
                            },
                            data: {
                                resultGolTimeCasa: matchingResponse.score.fulltime.home,
                                resultGolTimeFora: matchingResponse.score.fulltime.away,
                                statusJogo: matchingResponse.fixture.status.long,
                                //resultGolTimeCasa: matchingResponse.goals.home,
                                //resultGolTimeFora: matchingResponse.goals.away,
                                //statusJogo: matchingResponse.fixture.status.long
                            },
                        });
                    }
                });
                await Promise.all(updatejogos);
            }
            const responseUpdate = await updatePoints(originalDate);
            if (!responseUpdate) {
                return reply.status(400).send({ error: { responseUpdate } });
            }
            return reply.status(200).send({ message: "sucesso" });
        }
        catch (error) {
            console.log(error);
            return reply.status(400).send({ error });
        }
    });
    // lista jogos cadastrados do bolão
    /*
    fastify.get('/bolao/:id/jogos', {
      onRequest: [authenticate]
    }, async (request) => {
  
      const getBolaoParams = z.object({
        id: z.string(),
      })
  
      const { id } = getBolaoParams.parse(request.params)
  
      const jogos = await prisma.jogo.findMany({
        orderBy: {
          data: 'asc',
        },
        include: {
          palpites: {
            where: {
              participante: {
                usuario_id: parseInt(request.user.sub),
                bolao_id: parseInt(id),
              }
            }
          }
        }
  
      })
      // retorna apenas um palpite por usuario
      return {
        jogos: jogos.map(jogo => {
          return {
            ...jogo,
            palpite: jogo.palpites.length > 0 ? jogo.palpites[0] : null,
            palpites: undefined,
          }
        })
      }
    })
    */
}
exports.jogoRoutes = jogoRoutes;
async function updatePoints(date) {
    try {
        dayjs_1.default.extend(utc_1.default);
        const dateInicial = dayjs_1.default.utc(date);
        const dateInicialComUTC4 = dateInicial.add(4, "hour");
        const dateFinal = dateInicial.add(1, "day");
        const dateFinalComUTC4 = dateFinal.add(4, "hour");
        // busca todos os palpites dos bolões conforme data informada
        const palpites = await prisma_1.prisma.palpite.findMany({
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
        });
        palpites.map(async (item) => {
            let jogo = await prisma_1.prisma.jogo.findFirst({
                where: {
                    Jogos_boloes: {
                        some: {
                            id: item.jogoBolao_id,
                        },
                    },
                },
            });
            if (jogo?.resultGolTimeCasa != null && jogo?.resultGolTimeFora != null) {
                let pontuacao = 0;
                if (item.golTimeCasa === jogo.resultGolTimeCasa &&
                    item.golTimeFora === jogo.resultGolTimeFora) {
                    pontuacao = 21;
                }
                else {
                    let controlePalpite = item.golTimeCasa > item.golTimeFora
                        ? 2
                        : item.golTimeCasa < item.golTimeFora
                            ? 1
                            : 0;
                    let controleResultadoJogo = jogo.resultGolTimeCasa > jogo.resultGolTimeFora
                        ? 2
                        : jogo.resultGolTimeCasa < jogo.resultGolTimeFora
                            ? 1
                            : 0;
                    pontuacao = controlePalpite === controleResultadoJogo ? 10 : 0;
                }
                await prisma_1.prisma.palpite.update({
                    where: {
                        id: item.id,
                    },
                    data: {
                        pontuacao: pontuacao,
                    },
                });
            }
        });
        return true;
    }
    catch (error) {
        return error;
    }
    /*
    // calcula a pontuação dos palpites
    palpites.map(async (item) => {
      // para cada palpite retorna os dados do jogo
      let jogo = await prisma.jogo.findFirst({
        where: {
          Jogos_boloes: {
            some: {
              id: item.jogoBolao_id,
            },
          },
        },
      });
  
      // verifica se o jogo tem resultado definido
      if (jogo?.resultGolTimeCasa != null && jogo?.resultGolTimeFora != null) {
        // se acertou o placar exato
        if (
          item.golTimeCasa === jogo.resultGolTimeCasa &&
          item.golTimeFora === jogo.resultGolTimeFora
        ) {
          await prisma.palpite.update({
            where: {
              id: item.id,
            },
            data: {
              pontuacao: 21,
            },
          });
        } else {
          // verifica se o palpite foi de vitória casa, fora ou empate
          let controlePalpite;
          item.golTimeCasa > item.golTimeFora
            ? (controlePalpite = 2)
            : item.golTimeCasa < item.golTimeFora
            ? (controlePalpite = 1)
            : (controlePalpite = 0);
  
          // verifica se o placar foi de vitoria casa, fora ou empate
          let controleResultadoJogo;
          jogo.resultGolTimeCasa > jogo.resultGolTimeFora
            ? (controleResultadoJogo = 2)
            : jogo.resultGolTimeCasa < jogo.resultGolTimeFora
            ? (controleResultadoJogo = 1)
            : (controleResultadoJogo = 0);
  
          // compara se acertou o vencedor/empate
  
          if (controlePalpite === controleResultadoJogo) {
            await prisma.palpite.update({
              where: {
                id: item.id,
              },
              data: {
                pontuacao: 10,
              },
            });
          } else {
            await prisma.palpite.update({
              where: {
                id: item.id,
              },
              data: {
                pontuacao: 0,
              },
            });
          }
        }
      }
    });
    */
}
