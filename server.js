const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = mysql.createConnection({
    host: 'https://gpa-cadastro.onrender.com/api', // Altere para o nome do host fornecido pelo Render
    user: 'root',
    password: 'Mudar-55',
    database: 'gpa_cadastro',
  });
  

// Verifica a conexão
db.connect((err) => {
  if (err) {
    console.error('Erro ao conectar com o banco de dados:', err.stack);
    return;
  }
  console.log('Conectado ao banco de dados MySQL');
});

// Criar tabela se não existir
db.query(`
  CREATE TABLE IF NOT EXISTS coletores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    matricula VARCHAR(255) NOT NULL,
    coletor VARCHAR(255) NOT NULL UNIQUE,
    turno VARCHAR(255) NOT NULL,
    data DATE NOT NULL
  )
`, (err, results) => {
  if (err) {
    console.error('Erro ao criar tabela:', err.stack);
  } else {
    console.log('Tabela coletores criada ou já existe');
  }
});

// Rotas (API)
// Rota de cadastro e atualização de coletor
app.post('/api/cadastrar', (req, res) => {
    const { matricula, coletor, turno } = req.body;
    const data = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');

    if (!matricula || !coletor || !turno) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios!' });
    }

    // Verificar se o coletor já existe
    const checkStmt = 'SELECT * FROM coletores WHERE coletor = ?';
    db.query(checkStmt, [coletor], (err, results) => {
        if (err) {
            console.error('Erro ao verificar coletor:', err);
            return res.status(500).json({ message: 'Erro ao verificar o coletor!' });
        }

        if (results.length > 0) {
            // Se o coletor já existir, atualiza os dados
            const updateStmt = 'UPDATE coletores SET matricula = ?, turno = ?, data = ? WHERE coletor = ?';
            db.query(updateStmt, [matricula, turno, data, coletor], (err) => {
                if (err) {
                    console.error('Erro ao atualizar coletor:', err);
                    return res.status(500).json({ message: 'Erro ao atualizar o coletor!' });
                }
                res.status(200).json({ message: 'Coletor atualizado com sucesso!' });
            });
        } else {
            // Caso o coletor não exista, faz o cadastro
            const insertStmt = 'INSERT INTO coletores (matricula, coletor, turno, data) VALUES (?, ?, ?, ?)';
            db.query(insertStmt, [matricula, coletor, turno, data], (err) => {
                if (err) {
                    console.error('Erro ao cadastrar coletor:', err);
                    return res.status(500).json({ message: 'Erro ao cadastrar o coletor!' });
                }
                res.status(200).json({ message: 'Coletor cadastrado com sucesso!' });
            });
        }
    });
});


app.post('/api/devolver', (req, res) => {
  const { coletor } = req.body;

  if (!coletor) {
    return res.status(400).json({ message: 'O coletor é obrigatório!' });
  }

  const stmt = 'DELETE FROM coletores WHERE coletor = ?';
  db.query(stmt, [coletor], (err) => {
    if (err) {
      console.error('Erro ao devolver coletor:', err);
      return res.status(500).json({ message: 'Erro ao devolver o coletor!' });
    }
    res.status(200).json({ message: 'Coletor devolvido com sucesso!' });
  });
});

app.get('/api/coletores', (req, res) => {
  const stmt = 'SELECT * FROM coletores';
  db.query(stmt, (err, rows) => {
    if (err) {
      console.error('Erro ao listar coletores:', err);
      return res.status(500).json({ message: 'Erro ao obter a lista de coletores!' });
    }
    res.status(200).json(rows);
  });
});

// Servir o index.html na rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
