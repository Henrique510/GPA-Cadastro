require('dotenv').config();
const express = require('express');
const { Client } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// Ajuste de Porta para Nuvem
const PORT = process.env.PORT || 1979;

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- CONFIGURAÇÃO DO BANCO DE DADOS ---
// Se não houver DATABASE_URL, o sistema avisará em vez de tentar o localhost
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ ERRO: A variável DATABASE_URL não foi encontrada!");
    console.error("Verifique as 'Variables' no painel do Railway.");
}

const client = new Client({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false // Obrigatório para Railway/Render
    }
});

// Conectar ao Banco com tratamento de erro
client.connect()
    .then(() => console.log('✅ Conectado ao PostgreSQL do Railway'))
    .catch(err => {
        console.error('❌ Erro fatal ao conectar no banco:', err.message);
        // Não encerra o processo imediatamente para permitir ver o log no Railway
    });

// --- INICIALIZAÇÃO DE TABELAS ---
const initDb = async () => {
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS coletores (
                id SERIAL PRIMARY KEY,
                matricula VARCHAR(255) NOT NULL,
                coletor VARCHAR(255) NOT NULL,
                turno VARCHAR(255) NOT NULL,
                data DATE NOT NULL,
                status VARCHAR(255) DEFAULT 'Pendente',
                data_expiracao TIMESTAMP,
                headset VARCHAR(255),
                nome_colaborador VARCHAR(255)
            );
            CREATE TABLE IF NOT EXISTS colaboradores (
                id SERIAL PRIMARY KEY,
                matricula VARCHAR(255) NOT NULL,
                nome VARCHAR(255) NOT NULL,
                turno VARCHAR(255) NOT NULL,
                setor VARCHAR(255) NOT NULL
            );
            CREATE TABLE IF NOT EXISTS equipamentos (
                id SERIAL PRIMARY KEY,
                id_pulsus VARCHAR(255),
                identificador VARCHAR(255) NOT NULL,
                patrimonio VARCHAR(255),
                numero VARCHAR(255),
                condicao VARCHAR(255) NOT NULL,
                tipo_equipamento VARCHAR(255),
                propriedade VARCHAR(255)
            );
        `);
        console.log('✅ Tabelas verificadas.');
    } catch (err) {
        console.error('❌ Erro ao criar tabelas:', err);
    }
};
initDb();

// --- ROTAS DA API ---

// Verificar se o Colaborador existe
app.get('/api/verificarColaborador', async (req, res) => {
    const { matricula } = req.query;
    try {
        const result = await client.query('SELECT nome FROM colaboradores WHERE matricula = $1', [matricula]);
        if (result.rows.length > 0) {
            res.json({ encontrado: true, nome: result.rows[0].nome });
        } else {
            res.json({ encontrado: false });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Cadastrar Empréstimo (com baixa automática)
app.post('/api/cadastrar', async (req, res) => {
    const { matricula, coletor, turno, headset } = req.body;
    const dataHoje = new Date().toISOString().split('T')[0];

    try {
        const colab = await client.query('SELECT nome FROM colaboradores WHERE matricula = $1', [matricula]);
        if (colab.rows.length === 0) return res.status(404).json({ message: 'Colaborador não cadastrado.' });

        // Baixa automática de pendência anterior do mesmo coletor
        await client.query("UPDATE coletores SET status = 'Devolvido', data_expiracao = NOW() WHERE coletor = $1 AND status = 'Pendente'", [coletor]);

        await client.query(
            `INSERT INTO coletores (matricula, coletor, turno, data, status, headset, nome_colaborador) 
             VALUES ($1, $2, $3, $4, 'Pendente', $5, $6)`,
            [matricula, coletor, turno, dataHoje, headset, colab.rows[0].nome]
        );

        res.status(201).json({ success: true, message: 'Empréstimo registrado!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Cadastrar Novo Colaborador
app.post('/api/cadastrarColaborador', async (req, res) => {
    const { matricula, nome, turno, setor } = req.body;
    try {
        await client.query(
            'INSERT INTO colaboradores (matricula, nome, turno, setor) VALUES ($1, $2, $3, $4)',
            [matricula, nome, turno, setor]
        );
        res.status(201).json({ message: 'Colaborador cadastrado!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Devolução Manual
app.post('/api/devolver', async (req, res) => {
    const { coletor } = req.body;
    try {
        const result = await client.query(
            "UPDATE coletores SET status = 'Devolvido', data_expiracao = NOW() WHERE coletor = $1 AND status = 'Pendente'",
            [coletor]
        );
        if (result.rowCount === 0) return res.status(404).json({ message: 'Não há pendência para este coletor.' });
        res.json({ success: true, message: 'Devolvido com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Listar Pendentes
app.get('/api/pendentes', async (req, res) => {
    try {
        const result = await client.query(`
            SELECT c.coletor, c.matricula, c.turno, c.data, col.nome 
            FROM coletores c
            LEFT JOIN colaboradores col ON c.matricula = col.matricula
            WHERE c.status = 'Pendente' ORDER BY c.id DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json([]);
    }
});

// Rota para o Frontend (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
