require('dotenv').config();
const express = require('express');
const { Client } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: '*', // Em produção, restrinja as origens (ex: 'https://seusite.com')
    methods: 'GET,POST', // Limita os métodos para maior segurança
    allowedHeaders: 'Content-Type', // Limita os headers permitidos
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuração do cliente PostgreSQL
const client = new Client({
    host: process.env.PG_HOST,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    port: process.env.PG_PORT,
    ssl: {
      rejectUnauthorized: false // NÃO RECOMENDADO EM PRODUÇÃO!
  }
});

client.connect(err => {
    if (err) {
        console.error('Erro ao conectar no banco:', err);
        process.exit(1);
    } else {
        console.log('Conectado ao PostgreSQL');
    }
});

// Cria tabela se não existir (com tratamento de erro mais robusto)
client.query(`
  CREATE TABLE IF NOT EXISTS coletores (
      id SERIAL PRIMARY KEY,
      matricula VARCHAR(255) NOT NULL,
      coletor VARCHAR(255) NOT NULL UNIQUE,
      turno VARCHAR(255) NOT NULL,
      data DATE NOT NULL,
      status VARCHAR(255) DEFAULT 'Pendente',
      data_expiracao TIMESTAMP
  );
`, (err, res) => {
  if (err) {
      console.error('Erro ao criar/verificar tabela:', err);
  } else {
      console.log('Tabela "coletores" pronta.');
  }
});


app.get('/api/coletores', (req, res) => {
  client.query('SELECT matricula, coletor, turno, data, status FROM coletores', (err, result) => { // Removido data_expiracao
      if (err) {
          console.error('Erro ao consultar coletores:', err);
          return res.status(500).json({ message: 'Erro ao obter dados.' });
      }
      res.json(result.rows);
  });
});
app.post('/api/cadastrar', (req, res) => {
    const { matricula, coletor, turno } = req.body;
    const data = new Date().toISOString().split('T')[0];

    client.query(
        `INSERT INTO coletores (matricula, coletor, turno, data) VALUES ($1, $2, $3, $4)
        ON CONFLICT (coletor) DO UPDATE SET matricula = $1, turno = $3, data = $4`,
        [matricula, coletor, turno, data],
        (err) => {
            if (err) {
                console.error('Erro ao cadastrar coletor:', err);
                return res.status(500).json({ message: 'Erro ao cadastrar.' });
            }
            res.status(201).json({ message: 'Coletor cadastrado com sucesso.' });
        }
    );
});

app.post('/api/devolver', async (req, res) => {
  const { coletor } = req.body;

  if (!coletor) {
      return res.status(400).json({ message: 'Campo coletor é obrigatório.' });
  }

  try {
      const result = await client.query(
          `UPDATE coletores SET status = 'Devolvido', data_expiracao = NOW() + INTERVAL '4 days' WHERE coletor = $1`,
          [coletor]
      );

      if (result.rowCount === 0) {
          return res.status(404).json({ message: `Coletor "${coletor}" não encontrado.` });
      }

      res.json({ message: 'Coletor devolvido com sucesso.' });
  } catch (error) {
      console.error('Erro ao devolver coletor:', error);
      res.status(500).json({ message: 'Erro ao devolver.' });
  }
});


// Limpeza do banco de dados (cron) - MANTIDA
async function limparBancoDeDados() {
  try {
      const result = await client.query(
          `DELETE FROM coletores WHERE status = 'Devolvido' AND data_expiracao <= NOW()`
      );
      console.log(`Limpeza: ${result.rowCount} registros excluídos em ${new Date().toLocaleString('pt-BR')}`);
  } catch (error) {
      console.error('Erro na limpeza do banco:', error);
  }
}

// Executa a limpeza diariamente à meia-noite (00:00)
cron.schedule('0 0 * * *', limparBancoDeDados);

// Executa a limpeza na inicialização do servidor
limparBancoDeDados();

// Inicia o servidor
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));