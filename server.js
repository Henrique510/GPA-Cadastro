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
        console.error('Erro ao criar/verificar tabela "coletores":', err);
    } else {
        console.log('Tabela "coletores" pronta.');
    }
});
client.query(`
    CREATE TABLE IF NOT EXISTS colaboradores (
        id SERIAL PRIMARY KEY,
        matricula VARCHAR(255) NOT NULL,
        nome VARCHAR(255) NOT NULL,
        turno VARCHAR(255) NOT NULL,
        setor VARCHAR(255) NOT NULL
    );
`, (err, res) => {
    if (err) {
        console.error('Erro ao criar/verificar tabela "colaboradores":', err);
    } else {
        console.log('Tabela "colaboradores" pronta.');
    }
});
client.query(`
    CREATE TABLE IF NOT EXISTS equipamentos (
        id SERIAL PRIMARY KEY,
        id_pulsus VARCHAR(255) NOT NULL,
        identificador VARCHAR(255) NOT NULL,
        patrimonio VARCHAR(255) NOT NULL,
        numero VARCHAR(255) NOT NULL,
        condicao VARCHAR(255) NOT NULL
    );
`, (err, res) => {
    if (err) {
        console.error('Erro ao criar/verificar tabela "equipamentos":', err);
    } else {
        console.log('Tabela "equipamentos" pronta.');
    }
});

app.get('/api/coletores', (req, res) => {
    client.query(`
        SELECT c.matricula, c.coletor AS equipamento, c.turno, c.data, c.status, c.headset
        FROM coletores c`, (err, result) => {
        if (err) {
            console.error('Erro ao consultar coletores:', err);
            return res.status(500).json({ message: 'Erro ao obter dados.' });
        }
        res.json(result.rows);
    });
});

app.post('/api/cadastrar', (req, res) => {
    const { matricula, coletor, turno, headset } = req.body;
    const data = new Date().toISOString().split('T')[0];

    client.query(
        `SELECT * FROM coletores WHERE matricula = $1 AND coletor = $2 AND turno = $3 AND data = $4`,
        [matricula, coletor, turno, data],
        (err, result) => {
            if (err) {
                console.error('Erro ao verificar duplicidade:', err);
                return res.status(500).json({ message: 'Erro ao verificar duplicidade.' });
            }

            if (result.rows.length > 0) {
                return res.status(409).json({ message: 'Este coletor já está cadastrado.' });
            }

            client.query(
                `INSERT INTO coletores (matricula, coletor, turno, data, status, headset) VALUES ($1, $2, $3, $4, 'Pendente', $5)`,
                [matricula, coletor, turno, data, headset],
                (err, result) => {
                    if (err) {
                        console.error('ERRO na query de cadastro:', err);
                        return res.status(500).json({ message: `Erro ao cadastrar: ${err.message}` });
                    }

                    console.log("Resultado da query de cadastro:", result);
                    res.status(201).json({ message: 'Coletor cadastrado com sucesso.' });
                }
            );
        }
    );
});

app.post('/api/cadastrarEquipamento', async (req, res) => {
    const { idPulsus, identificador, patrimonio, numero, condicao } = req.body;

    try {
        await client.query(
            'INSERT INTO equipamentos (id_pulsus, identificador, patrimonio, numero, condicao) VALUES ($1, $2, $3, $4, $5)',
            [idPulsus, identificador, patrimonio, numero, condicao]
        );
        res.status(201).json({ message: 'Equipamento cadastrado com sucesso.' });
    } catch (error) {
        console.error('Erro ao cadastrar equipamento:', error);
        res.status(500).json({ message: 'Erro ao cadastrar equipamento.' });
    }
});

app.get('/api/equipamentos', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM equipamentos');
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar equipamentos:', error);
        res.status(500).json({ message: 'Erro ao buscar equipamentos.' });
    }
});

app.post('/api/cadastrarColaborador', async (req, res) => {
    const { matricula, nome, turno, setor } = req.body;

    try {
        await client.query(
            'INSERT INTO colaboradores (matricula, nome, turno, setor) VALUES ($1, $2, $3, $4)',
            [matricula, nome, turno, setor]
        );
        res.status(201).json({ message: 'Colaborador cadastrado com sucesso.' });
    } catch (error) {
        console.error('Erro ao cadastrar colaborador:', error);
        res.status(500).json({ message: 'Erro ao cadastrar colaborador: ' + error.message }); // Adiciona a mensagem de erro
    }
});

app.get('/api/colaboradores', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM colaboradores');
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar colaboradores:', error);
        res.status(500).json({ message: 'Erro ao buscar colaboradores.' });
    }
});
app.get('/api/contagem-status', (req, res) => {
    client.query(`
        SELECT 
            COUNT(CASE WHEN condicao = 'Operando' THEN 1 END) AS operando,
            COUNT(CASE WHEN condicao = 'Quebrado' THEN 1 END) AS quebrado
        FROM equipamentos
    `, (err, result) => {
        if (err) {
            console.error('Erro ao obter contagem de status de equipamentos:', err);
            return res.status(500).json({ message: 'Erro ao obter contagem de status de equipamentos.' });
        }
        console.log('Dados retornados pela contagem de status de equipamentos:', result.rows[0]);
        res.json(result.rows[0]);
    });
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

        res.json({});
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