import { PrismaClient } from "@prisma/client";
import { jogoRoutes } from "../src/routes/jogo";

const prisma = new PrismaClient();

async function main() {

  const usuario = await prisma.usuario.create({
    data: {
      nome: "John Doe",
      email: "john.doe@gmail.com",
      senha: "12345",
      avatarUrl: "https://github.com/luislong0.png",
    },
  });

  const bolao = await prisma.bolao.create({
    data: {
      nome: 'Bolão da Firma',
      codigo: 'BOL123',
      donoBolaoId: usuario.id,
      /*
      participantes: {
        create: {
          usuario_id: usuario.id
        },
      },
      */
    },
  });

  const participante = await prisma.participante.create({
    data: {
      bolao_id: bolao.id,
      usuario_id: usuario.id,
    }
  })

  await prisma.jogo.create({
    data: {
      data: '2022-12-29T15:00:00.535Z',
      timeCasa: 'FLAMENGO',
      timeFora: 'AVAÍ',
      competicao: 'BRASILEIRÃO',
      logoTimeCasa: 'https://media.api-sports.io/football/teams/127.png',
      logoTimeFora: 'https://media.api-sports.io/football/teams/145.png',
      resultGolTimeCasa: null,
      resultGolTimeFora: null,

    },
  });

  const jogo = await prisma.jogo.create({
    data: {
      data: '2022-12-31T15:00:00.535Z',
      timeCasa: 'FLAMENGO',
      timeFora: 'SÃO PAULO',
      competicao: 'BRASILEIRÃO',
      logoTimeCasa: 'https://media.api-sports.io/football/teams/127.png',
      logoTimeFora: 'https://media.api-sports.io/football/teams/140.png',
      resultGolTimeCasa: null,
      resultGolTimeFora: null,


      /*
      Jogos_boloes: {
        create: {
          bolao_id: bolao.id
        }
      }
      */




      /*
            palpites: {
              create: {
                golTimeCasa: 2,
                golTimeFora: 0,
      
                participante: {
                  connect: {
                    usuario_id_bolao_id: {
                      usuario_id: usuario.id,
                      bolao_id: bolao.id
                    },
                  },
                },
              },
            },
      */
    },
  });

  const jogo_bolao = await prisma.jogo_bolao.create({
    data: {
      jogo_id: jogo.id,
      bolao_id: bolao.id
    }
  })

  await prisma.palpite.create({
    data: {
      golTimeCasa: 2,
      golTimeFora: 0,
      participante_id: participante.id,
      jogoBolao_id: jogo_bolao.id
    }
  })
}

main()