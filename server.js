require('dotenv').config();
const express = require('express');
const { Client } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
    origin: '*',
    methods: 'GET,POST',
    allowedHeaders: 'Content-Type',
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const client = new Client({
    host: process.env.PG_HOST,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    port: process.env.PG_PORT,
    ssl: {
        rejectUnauthorized: false
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

// REMOVIDO o UNIQUE da coluna coletor na criação da tabela
client.query(`
    CREATE TABLE IF NOT EXISTS coletores (
        id SERIAL PRIMARY KEY,
        matricula VARCHAR(255) NOT NULL,
        coletor VARCHAR(255) NOT NULL,
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
    client.query('SELECT matricula, coletor, turno, data, status FROM coletores', (err, result) => {
        if (err) {
            console.error('Erro ao consultar coletores:', err);
            return res.status(500).json({ message: 'Erro ao obter dados.' });
        }
        res.json(result.rows);
    });
});

// ROTA /api/cadastrar SIMPLIFICADA (sem verificação de duplicidade)
app.post('/api/cadastrar', (req, res) => {
    const { matricula, coletor, turno, headset } = req.body; // Adicione headset aqui
    const data = new Date().toISOString().split('T')[0];

    console.log("Dados recebidos para cadastro:", { matricula, coletor, turno, data, headset });

    client.query(
        `INSERT INTO coletores (matricula, coletor, turno, data, status, headset) VALUES ($1, $2, $3, $4, 'Pendente', $5)`, // Inclua headset na query
        [matricula, coletor, turno, data, headset], // Adicione headset aos parâmetros
        (err, result) => {
            if (err) {
                console.error('ERRO na query de cadastro:', err);
                return res.status(500).json({ message: 'Erro ao cadastrar.' });
            }

            console.log("Resultado da query de cadastro:", result);
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

app.get('/api/contagens', (req, res) => {
  client.query(`
      SELECT
          COUNT(DISTINCT CASE WHEN coletor LIKE 'Z%' AND status = 'Pendente' THEN coletor END) AS Z,
          COUNT(DISTINCT CASE WHEN coletor LIKE 'C%' AND status = 'Pendente' THEN coletor END) AS C,
          COUNT(DISTINCT CASE WHEN coletor LIKE 'T%' AND status = 'Pendente' THEN coletor END) AS T
      FROM coletores;
  `, (err, result) => {
      if (err) {
          console.error('Erro ao obter contagens:', err);
          return res.status(500).json({ message: 'Erro ao obter contagens.' });
      }
      res.json(result.rows[0]);
  });
});


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

cron.schedule('0 0 * * *', limparBancoDeDados);
limparBancoDeDados();

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));