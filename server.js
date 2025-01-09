require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
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
if (!process.env.MYSQL_HOST || !process.env.MYSQL_USER || !process.env.MYSQL_PASSWORD || !process.env.MYSQL_DATABASE || !process.env.MYSQL_PORT) {
  console.error('Erro: Variáveis de ambiente do banco de dados não configuradas corretamente.');
  process.exit(1);
}

// Conexão com MySQL
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT,
});

// Verifica conexão com o banco
db.connect(err => {
  if (err) {
    console.error('Erro ao conectar no banco:', err.stack);
    process.exit(1);
  } else {
    console.log('Conectado ao MySQL');
  }
});

// Cria tabela se não existir
db.query(`
  CREATE TABLE IF NOT EXISTS coletores (
    id INT AUTO_INCREMENT PRIMARY KEY,
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
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Erro ao consultar os dados:', err);
      return res.status(500).json({ message: 'Erro ao obter dados' });
    }
    res.json(results);
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
    VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE matricula=?, turno=?, data=?
  `;
  db.query(query, [matricula, coletor, turno, data, matricula, turno, data], (err) => {
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

  const query = 'DELETE FROM coletores WHERE coletor = ?';
  db.query(query, [coletor], err => {
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
