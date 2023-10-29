import { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from "../lib/prisma"
import { authenticate } from "../plugins/authenticate"
import bcrypt from 'bcrypt'

export async function authRoutes(fastify: FastifyInstance) {

  fastify.get('/me', {
    onRequest: [authenticate]
  }, async (request) => {

    let user = await prisma.usuario.findFirst({
      where: {
        id: Number(request.user.sub)
      },
      select: {
        id: true,
        nome: true,
        email: true,
        cidade: true,
        estado: true,
        telefone: true,
        googleId: true,
        avatarUrl: true,
        isAdmin: true,
        createdAt: true
      }
    })

    return { user: user }
  })

  fastify.post('/newPassword', {
    onRequest: [authenticate]
  }, async (request, reply) => {
    try {
      const loginBody = z.object({
        email: z.string().email(),
        senha: z.string()
      })

      const { email, senha } = loginBody.parse(request.body)

      let usuario = await prisma.usuario.findFirst({
        where: {
          email: email
        }
      })

      if (!usuario) {
        return reply.status(400).send({
          message: 'Email não cadastrado'
        })
      }

      if (usuario.id != parseInt(request.user.sub) && request.user.isAdmin === false) {
        return reply.status(400).send({
          message: 'Sem permissão para editar informações'
        })
      }

      if (senha != null) {

        const hashPassword = await bcrypt.hash(senha, 10)
        await prisma.usuario.update({
          where: {
            email: email
          },
          data: {
            senha: hashPassword
          }
        })

        return reply.status(201).send({
          message: "Senha alterada com sucesso"
        })
      }
    } catch (error) {
      console.log(error)
      return reply.status(500).send({
        message: `Erro interno do servidor -> ${error}`
      });
    }
  })


  fastify.post('/login', async (request, reply) => {
    try {
      const loginBody = z.object({
        email: z.string().email(),
        senha: z.string(),
      })

      const { email, senha } = loginBody.parse(request.body)

      let usuario = await prisma.usuario.findFirst({
        where: {
          email: email
        }
      })

      if (!usuario) {
        return reply.status(400).send({
          message: 'Email não cadastrado'
        })
      }

      if (usuario.senha != null) {
        // verifica se a senha é correta
        if (await bcrypt.compare(senha, usuario.senha)) {
          // cria Token JWT
          const token = fastify.jwt.sign({
            //name: usuario.nome,
            //avatarUrl: usuario.avatarUrl,
            //isAdmin: usuario.isAdmin
          }, {
            sub: usuario.id.toString(),
            expiresIn: '7 days'
          })

          return { token }

        } else {
          return reply.status(400).send({
            message: "Senha incorreta"
          })
        }
      }

    } catch (error) {
      console.log(error)
      return reply.status(500).send({
        message: `Erro interno do servidor -> ${error}`
      });
    }
  })

  fastify.post('/signup', async (request, reply) => {
    try {
      const signupBody = z.object({
        nome: z.string(),
        email: z.string().email(),
        senha: z.string(),
        cidade: z.string(),
        estado: z.string(),
        telefone: z.string(),
      })

      const { nome, email, senha, cidade, estado, telefone } = signupBody.parse(request.body)

      let usuario = await prisma.usuario.findFirst({
        where: {
          email: email
        }
      })

      if (usuario) {
        return reply.status(400).send({
          message: 'Email ja cadastrado'
        })
      }

      const hashPassword = await bcrypt.hash(senha, 10)

      usuario = await prisma.usuario.create({
        data: {
          nome: nome,
          email: email,
          senha: hashPassword,
          cidade: cidade,
          estado: estado,
          telefone: telefone
        }
      })

      return reply.status(201).send({
        message: "Usuário cadastrado com sucesso"
      })

    } catch (error) {
      console.log(error)
      return reply.status(500).send({
        message: `Erro interno do servidor -> ${error}`
      });
    }
  })

  // cria usuario e token via autenticação da google
  fastify.post('/usuarios', async (request) => {

    console.log("RECEBI REQUISIÇÃO DE LOGIN");
    const createUserBody = z.object({
      access_token: z.string(),
    })

    // valida o formato do token
    const { access_token } = createUserBody.parse(request.body)
    console.log("TOKEM RECEBIDO DO FRONTEND");
    console.log(access_token);

    try {
      // faz a requisição para o google
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      })

      console.log("RESPOSTA COM OS DADOS DA GOOGLE");
      console.log(userResponse);

      // salva os dados da resposta do google
      const userData = await userResponse.json()

      // cria schema para validar infos da google
      const userInfoSchema = z.object({
        id: z.string(),
        email: z.string().email(),
        name: z.string(),
        picture: z.string().url(),
      })

      // valida infos do usuario da google
      const userInfo = userInfoSchema.parse(userData)

      // verifica se ja existe usuario cadastrado com google id
      let usuario = await prisma.usuario.findUnique({
        where: {
          googleId: userInfo.id,
        }
      })

      // se nao existir usuário, faz o cadastro
      if (!usuario) {
        usuario = await prisma.usuario.create({
          data: {
            googleId: userInfo.id,
            nome: userInfo.name,
            email: userInfo.email,
            senha: "null",
            avatarUrl: userInfo.picture,
          }
        })
      }

      const idString = usuario.id.toString()


      // cria Token JWT
      const token = fastify.jwt.sign({
        name: usuario.nome,
        avatarUrl: usuario.avatarUrl,
        isAdmin: usuario.isAdmin
      }, {
        sub: idString,
        expiresIn: '7 days',
      })

      return { token }

    } catch (error) {
      console.log(error)
    }

  })

}
