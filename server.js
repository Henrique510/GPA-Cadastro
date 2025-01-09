
require('dotenv').config();
const express = require('express');
const { Client } = require('pg'); // Usando o PostgreSQL em vez de MySQL
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Verifica variáveis de ambiente obrigatórias
if (!process.env.PG_HOST || !process.env.PG_USER || !process.env.PG_PASSWORD || !process.env.PG_DATABASE || !process.env.PG_PORT) {
    console.error('Erro: Variáveis de ambiente do banco de dados não configuradas corretamente.');
    process.exit(1);
  }
  

const client = new Client({
    host: process.env.PG_HOST,       // Atualizado para PG_HOST
    user: process.env.PG_USER,       // Atualizado para PG_USER
    password: process.env.PG_PASSWORD, // Atualizado para PG_PASSWORD
    database: process.env.PG_DATABASE, // Atualizado para PG_DATABASE
    port: process.env.PG_PORT,       // Atualizado para PG_PORT
    ssl: {
      rejectUnauthorized: false, // Permite a conexão sem validar o certificado
    },
  });
  

// Verifica conexão com o banco
client.connect(err => {
  if (err) {
    console.error('Erro ao conectar no banco:', err.stack);
    process.exit(1);
  } else {
    console.log('Conectado ao PostgreSQL');
  }
});

// Cria tabela se não existir
client.query(`
  CREATE TABLE IF NOT EXISTS coletores (
    id SERIAL PRIMARY KEY,
    matricula VARCHAR(255) NOT NULL,
    coletor VARCHAR(255) NOT NULL UNIQUE,
    turno VARCHAR(255) NOT NULL,
    data DATE NOT NULL
  );
`, err => {
  if (err) {
    console.error('Erro ao criar tabela:', err.stack);
    process.exit(1);
  }
});

// Rota para obter os dados dos coletores
app.get('/api/coletores', (req, res) => {
  const query = 'SELECT * FROM coletores';
  
  client.query(query, (err, results) => {
    if (err) {
      console.error('Erro ao consultar os dados:', err);
      return res.status(500).json({ message: 'Erro ao obter dados' });
    }
    res.json(results.rows); // Alterado para `rows`, que é a forma correta no PostgreSQL
  });
});

// Rota para cadastrar coletor
app.post('/api/cadastrar', (req, res) => {
  const { matricula, coletor, turno } = req.body;

  if (!matricula || !coletor || !turno) {
    return res.status(400).json({ message: 'Campos obrigatórios não preenchidos' });
  }

  const data = new Date().toISOString().split('T')[0];
  const query = `
    INSERT INTO coletores (matricula, coletor, turno, data) 
    VALUES ($1, $2, $3, $4) ON CONFLICT (coletor) DO UPDATE SET matricula=$1, turno=$3, data=$4
  `;
  client.query(query, [matricula, coletor, turno, data], (err) => {
    if (err) {
      console.error('Erro ao cadastrar:', err.stack);
      res.status(500).json({ message: 'Erro ao cadastrar' });
    } else {
      res.json({ message: 'Cadastrado com sucesso' });
    }
  });
});

// Rota para devolver coletor
app.post('/api/devolver', (req, res) => {
  const { coletor } = req.body;

  if (!coletor) {
    return res.status(400).json({ message: 'Campo coletor é obrigatório' });
  }

  const query = 'DELETE FROM coletores WHERE coletor = $1';
  client.query(query, [coletor], err => {
    if (err) {
      console.error('Erro ao devolver:', err.stack);
      res.status(500).json({ message: 'Erro ao devolver' });
    } else {
      res.json({ message: 'Devolução realizada' });
    }
  });
});

// Servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
