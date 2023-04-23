const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const cors = require('cors')
const jwt = require('jsonwebtoken')

const app = express()

// Conectar ao MongoDB
mongoose
  .connect('mongodb://127.0.0.1:27017/sistema-de-chamados', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Conectado ao MongoDB')
  })
  .catch((erro) => {
    console.log('Erro ao conectar ao MongoDB:', erro)
  })

// Modelo de schema para os dados que serão salvos no MongoDB
const Usuario = mongoose.model('Usuario', {
  nome: String,
  email: String,
  senha: String,
})

// Configuração do middleware para o bodyParser
app.use(bodyParser.json())

// Middleware para permitir solicitações de outros domínios (CORS)
app.use(cors())

// Rota para criar um novo usuário
app.post('/usuarios', async (req, res) => {
  const { nome, email, senha } = req.body

  // Verificar se o email já existe no banco de dados
  const usuarioExistente = await Usuario.findOne({ email })
  if (usuarioExistente) {
    return res.status(400).send({ erro: 'Email já cadastrado !' })
  }

  const usuario = new Usuario({ nome, email, senha })

  try {
    await usuario.save()
    res.send(usuario)
  } catch (err) {
    res.status(500).send('Erro ao cadastrar usuário: ' + err)
  }
})

// Rota para listar todos os usuários
app.get('/usuarios', async (req, res) => {
  try {
    const usuarios = await Usuario.find()
    res.send(usuarios)
  } catch (err) {
    res.status(500).send('Erro ao listar usuários: ' + err)
  }
})

// Rota para buscar um usuário pelo ID
app.get('/usuarios/:id', async (req, res) => {
  const { id } = req.params

  try {
    const usuario = await Usuario.findById(id)
    res.send(usuario)
  } catch (err) {
    res.status(500).send('Erro ao listar usuários pelo id: ' + err)
  }
})

// Rota para atualizar um usuário pelo ID
app.put('/usuarios/:id', async (req, res) => {
  const { id } = req.params
  const { nome, email, senha } = req.body

  try {
    const usuario = await Usuario.findByIdAndUpdate(id, {
      nome,
      email,
      senha,
    })
    res.send(usuario)
  } catch (err) {
    res.status(500).send('Erro ao atualizar um usuário pelo id: ' + err)
  }
})

// Rota para excluir um usuário pelo ID
app.delete('/usuarios/:id', async (req, res) => {
  const { id } = req.params

  try {
    const usuario = await Usuario.findByIdAndDelete(id)
    res.send(usuario)
  } catch (err) {
    res.status(500).send('Erro ao deletar usuário pelo id: ' + err)
  }
})

// Rota para fazer login
app.post('/login', async (req, res) => {
  const { email, senha } = req.body

  try {
    const usuario = await Usuario.findOne({ email })

    if (!usuario) {
      return res.status(400).send({ erro: 'Usuário não encontrado' })
    }

    if (usuario.senha !== senha) {
      return res.status(400).send({ erro: 'Senha incorreta' })
    }

    // Gerar token de autenticação
    const token = jwt.sign({ id: usuario._id }, 'chave_secreta_do_token')

    res.send({ token })
  } catch (err) {
    res.status(500).send('Erro ao fazer login: ' + err)
  }
})

// Rota para verificar se o token é válido
app.post('/verificar-token', async (req, res) => {
  const token = req.body.token

  if (!token) {
    return res.status(401).json({ mensagem: 'Token não fornecido.' })
  }

  try {
    const decoded = jwt.verify(token, 'chave_secreta_do_token')
    const usuario = await Usuario.findById(decoded.id)

    if (!usuario) {
      return res
        .status(401)
        .json({ mensagem: 'Token do usuário não encontrado.' })
    }

    res.json({ isAuthenticated: true })
  } catch (err) {
    res.status(401).json({ mensagem: 'Token inválido.' })
  }
})

// Inicia o servidor na porta 8000
app.listen(8000, () => {
  console.log('Servidor iniciado na porta 8000')
})
