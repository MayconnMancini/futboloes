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
const axios_1 = __importDefault(require("axios"));
/*
  PONTUAÇÃO EXATA : 21 PONTOS
  ACERTOU O TIME VITORIOSO: 10 PONTOS
  ACERTOU QUE VAI DAR EMPATE: 10 PONTOS
*/
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
    }, async (request) => {
        const getBolaoParams = zod_1.z.object({
            datas: zod_1.z.string(),
        });
        const { datas } = getBolaoParams.parse(request.params);
        let originalDate = datas;
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
            //return data["response"]
            const resp = data["response"];
            //console.log("############  RESPOSTA ##############");
            //console.log("resp jogos", resp);
            //console.log("############  CONVERSÃO ##############");
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
            //let lastDay = new Date(datas);
            //console.log(new Date("2023-01-13").toDateString())
            dayjs_1.default.extend(utc_1.default);
            //console.log(datas);
            //console.log(dayjs(datas))
            //console.log(dayjs("2023-01-12").format());
            //console.log(dayjs("2023-01-13").format());
            //console.log(dayjs().format());
            //console.log(dayjs.utc(datas).format());
            //console.log("==========================");
            //console.log(dayjs(datas).format());
            //console.log(dayjs(datas).add(1, "day").format());
            //console.log(new Date("2023-01-13").toISOString());
            // datas no banco de dados são salvas em formato UTC. Entao deve-se usar essa estrategia para retornar
            // os jogos do dia conforme localtime do usuário.
            //Exemplo: Buscar jogo do dia 2023-01-12. Se fosse buscar UTC seria 2023-01-12T00:00 2023-01-12T23:59,
            // Porém se tiver um jogo as 22h local do usuário, no BD esse jogo estaria salvo no dia 13, com isso não iria
            // aparecer no retorno da busca. Por isso deve se adotar o exemplo abaixo.
            // busca jogos na data fornecida. Ele faz o intervalo entre a data fornecida + date UTC (+4)
            // + 1 dia.
            //jogos do dia 2023-01-12. Converte para (maior ou igual à) 2023-01-12+04:00 e (menor que) 2023-01-13T04:00 == 2023-01-12T04:00 à 2023-01-13T03:59
            //
            const jogosBD = await prisma_1.prisma.jogo.findMany({
                where: {
                    AND: [
                        {
                            data: {
                                gte: (0, dayjs_1.default)(datas).format(),
                            },
                        },
                        {
                            data: {
                                lt: (0, dayjs_1.default)(datas).add(1, "day").format(),
                            },
                        },
                    ],
                },
            });
            console.log("jogos bd", jogosBD.length);
            jogosBD.map(async (item) => {
                resp.map(async (r) => {
                    if (item.fixtureIdApi == r.fixture.id &&
                        r.fixture.status.elapsed >= 90) {
                        console.log("id encontrado", item);
                        console.log(r.fixture.id);
                        await prisma_1.prisma.jogo.update({
                            where: {
                                id: item.id,
                            },
                            data: {
                                resultGolTimeCasa: r.score.fulltime.home,
                                resultGolTimeFora: r.score.fulltime.away,
                                statusJogo: r.fixture.status.long,
                                //resultGolTimeCasa: r.goals.home,
                                //resultGolTimeFora: r.goals.away,
                                //statusJogo: r.fixture.status.long
                            },
                        });
                    }
                });
            });
            // SALVA O RESULTADO DOS JOGOS - FORMA CONVENCIONAL
            //jogosBD.forEach(item => {
            //  resp.forEach((r: any) => {
            //    if (item.fixtureIdApi === r.fixture.id && r.fixture.status.short === "FT") {
            //      console.log("id encontrado")
            //      console.log(r.fixture.id)
            //      item.resultGolTimeCasa = r.score.fulltime.home
            //      item.resultGolTimeFora = r.score.fulltime.away
            //    }
            //  });
            //});
            //console.log(teste);
            //return resp.sort((c1: any, c2: any) => (c1.league.id > c2.league.id) ? 1 : (c1.league.id < c2.league.id) ? -1 : 0);
            //console.log(jogosBD)
            await updatePoints(originalDate);
            return { message: "sucesso" };
        }
        catch (error) {
            console.log(error);
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
    dayjs_1.default.extend(utc_1.default);
    // busca todos os palpites dos bolões conforme data informada
    const palpites = await prisma_1.prisma.palpite.findMany({
        where: {
            jogoBolao: {
                jogo: {
                    AND: [
                        {
                            data: {
                                gte: (0, dayjs_1.default)(date).format(),
                            },
                        },
                        {
                            data: {
                                lt: (0, dayjs_1.default)(date).add(1, "day").format(),
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
