require('dotenv').config();
const express = require('express');
const { Client } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

// AJUSTE DE PORTA: Aceita a porta da nuvem ou a 1979
const PORT = process.env.PORT || 1979;

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
}));

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// CONFIGURAÇÃO DO BANCO: Ajustada para aceitar conexões locais e nuvem (Railway/Render)
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

client.connect(err => {
    if (err) {
        console.error('Erro ao conectar no banco:', err);
        process.exit(1);
    } else {
        console.log('✅ Conectado ao PostgreSQL');
    }
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
        console.log('✅ Tabelas verificadas/prontas.');
    } catch (err) {
        console.error('❌ Erro ao criar tabelas:', err);
    }
};
initDb();

// --- ROTAS ---

// Cadastro de Coletor (Empréstimo)
app.post('/api/cadastrar', async (req, res) => {
    const { matricula, coletor, turno, headset } = req.body;
    const data = new Date().toISOString().split('T')[0];

    try {
        const colaboradorResult = await client.query('SELECT nome FROM colaboradores WHERE matricula = $1', [matricula]);
        if (colaboradorResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Colaborador não encontrado.' });
        }
        const nomeColaborador = colaboradorResult.rows[0].nome;

        const equipamentoResult = await client.query('SELECT condicao FROM equipamentos WHERE identificador = $1 OR numero = $1', [coletor]);
        if (equipamentoResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Equipamento não existe na base.' });
        }

        if (equipamentoResult.rows[0].condicao.toLowerCase().includes('quebrado')) {
            return res.status(400).json({ success: false, message: 'Equipamento está QUEBRADO no sistema.' });
        }

        // Baixa automática
        await client.query("UPDATE coletores SET status = 'Devolvido', data_expiracao = NOW() WHERE coletor = $1 AND status = 'Pendente'", [coletor]);

        const insertResult = await client.query(
            `INSERT INTO coletores (matricula, coletor, turno, data, status, headset, nome_colaborador) 
             VALUES ($1, $2, $3, $4, 'Pendente', $5, $6) RETURNING *`,
            [matricula, coletor, turno, data, headset, nomeColaborador]
        );

        res.status(201).json({ success: true, message: 'Cadastrado com sucesso.', data: insertResult.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Listar Pendentes (CORRIGIDA)
app.get('/api/pendentes', async (req, res) => {
    try {
        const query = `
            SELECT c.coletor, c.matricula, c.turno, c.data AS data_hora, col.nome AS nome 
            FROM coletores c
            LEFT JOIN colaboradores col ON c.matricula = col.matricula 
            WHERE c.status = 'Pendente' 
            ORDER BY c.data DESC`;
        
        const result = await client.query(query); // CORRIGIDO: de pool para client
        res.json(result.rows || []);
    } catch (err) {
        console.error(err);
        res.status(500).json([]);
    }
});

// Listar Equipamentos
app.get('/api/equipamentos', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM equipamentos');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar equipamentos.' });
    }
});

// Cadastrar Equipamento (CORRIGIDA)
app.post('/api/cadastrarEquipamento', async (req, res) => {
    const { idPulsus, identificador, patrimonio, numero, condicao, tipo_equipamento, propriedade } = req.body;
    try {
        await client.query(
            'INSERT INTO equipamentos (id_pulsus, identificador, patrimonio, numero, condicao, tipo_equipamento, propriedade) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [idPulsus, identificador, patrimonio, numero, condicao, tipo_equipamento, propriedade]
        );
        res.status(201).json({ message: 'Equipamento cadastrado!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao cadastrar.' });
    }
});

// Devolver Coletor
app.post('/api/devolver', async (req, res) => {
    const { coletor } = req.body;
    try {
        const result = await client.query(
            "UPDATE coletores SET status = 'Devolvido', data_expiracao = NOW() WHERE coletor = $1 AND status = 'Pendente'",
            [coletor]
        );
        if (result.rowCount === 0) return res.status(404).json({ message: 'Nenhum pendente encontrado.' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
