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

// Middleware que adiciona o usuário logado na propriedade req
const adicionarUsuarioLogado = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).send({ erro: 'Token não fornecido' })
  }

  try {
    const decoded = jwt.verify(token, 'chave_secreta_do_token')
    const usuario = await Usuario.findById(decoded.id)

    if (!usuario) {
      return res.status(401).send({ erro: 'Token inválido' })
    }

    req.user = usuario // Adiciona o objeto do usuário logado na propriedade req
    next()
  } catch (err) {
    res.status(401).send({ erro: 'Token inválido' })
  }
}

// Rota para atualizar um usuário pelo ID
app.put('/usuarios/:id', adicionarUsuarioLogado, async (req, res) => {
  const { id } = req.params
  const { nome, email, senha } = req.body
  const usuarioLogado = req.user

  try {
    const usuarioExistente = await Usuario.findOne({ email })
    if (usuarioExistente && usuarioExistente.email !== usuarioLogado.email) {
      return res.status(400).send({ erro: 'Email já cadastrado !' })
    }
    const usuario = await Usuario.findByIdAndUpdate(
      id,
      {
        ...(nome && { nome }), // atualizar apenas se o campo nome for enviado
        ...(email && { email }), // atualizar apenas se o campo email for enviado
        ...(senha && { senha }), // atualizar apenas se o campo senha for enviado
      },
      { new: true },
    )
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

// Rota para obter o usuário logado
app.get('/usuario-logado', adicionarUsuarioLogado, async (req, res) => {
  const usuarioLogado = req.user
  res.send(usuarioLogado)
})

///////////// Clientes /////////////
const Cliente = mongoose.model('Cliente', {
  nome: String,
  cnpj: String,
  endereco: String,
})

// Rota para criar um novo cliente
app.post('/clientes', async (req, res) => {
  try {
    const novoCliente = new Cliente(req.body)
    const cliente = await novoCliente.save()
    res.json(cliente)
  } catch (err) {
    res.status(500).send(err)
  }
})

// Rota para listar todos os clientes
app.get('/clientes', async (req, res) => {
  try {
    const clientes = await Cliente.find({})
    res.json(clientes)
  } catch (err) {
    res.status(500).send(err)
  }
})

// Rota para listar um cliente pelo ID
app.get('/clientes/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id)
    if (!cliente) res.status(404).send('Cliente não encontrado')
    res.json(cliente)
  } catch (err) {
    res.status(500).send(err)
  }
})

// Rota para atualizar um cliente pelo ID
app.put('/clientes/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true },
    )
    if (!cliente) res.status(404).send('Cliente não encontrado')
    res.json(cliente)
  } catch (err) {
    res.status(500).send(err)
  }
})

// Rota para excluir um cliente pelo ID
app.delete('/clientes/:id', async (req, res) => {
  try {
    const cliente = await Cliente.deleteOne({ _id: req.params.id })
    if (cliente.deletedCount === 0)
      res.status(404).send('Cliente não encontrado')
    res.json({ message: 'Cliente excluído com sucesso!' })
  } catch (err) {
    res.status(500).send(err)
  }
})

///////////// Chamados /////////////
const Chamado = mongoose.model('Chamado', {
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
  },
  assunto: String,
  status: String,
  descricao: String,
  dataCriacao: {
    type: Date,
    default: Date.now,
  },
})

// Cria um novo chamado
app.post('/chamados', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.body.cliente)
    if (!cliente) throw new Error('Cliente não encontrado')

    const chamado = new Chamado({
      cliente: cliente._id,
      assunto: req.body.assunto,
      status: req.body.status,
      descricao: req.body.descricao,
      dataCriacao: Date.now(),
    })

    await chamado.save()
    res.send(chamado)
  } catch (error) {
    res.status(500).send(error)
  }
})

// Lista todos os chamados
app.get('/chamados', async (req, res) => {
  try {
    const chamados = await Chamado.find({}).populate('cliente')
    res.send(chamados)
  } catch (error) {
    res.status(500).send(error)
  }
})

// Atualiza um chamado
app.put('/chamados/:id', async (req, res) => {
  try {
    const chamado = await Chamado.findById(req.params.id)
    if (!chamado) throw new Error('Chamado não encontrado')

    const cliente = await Cliente.findById(req.body.cliente)
    if (!cliente) throw new Error('Cliente não encontrado')

    chamado.cliente = cliente._id
    chamado.assunto = req.body.assunto
    chamado.status = req.body.status
    chamado.descricao = req.body.descricao

    await chamado.save()
    res.send(chamado)
  } catch (error) {
    res.status(500).send(error)
  }
})

// Deleta um chamado
app.delete('/chamados/:id', async (req, res) => {
  try {
    const result = await Chamado.deleteOne({ _id: req.params.id })
    if (result.deletedCount === 0) throw new Error('Chamado não encontrado')

    res.send({ message: 'Chamado removido com sucesso' })
  } catch (error) {
    res.status(500).send(error)
  }
})

// Inicia o servidor na porta 8000
app.listen(8000, () => {
  console.log('Servidor iniciado na porta 8000')
})
