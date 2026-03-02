require('dotenv').config();
const express = require('express');
const { Client } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

const PORT = process.env.PORT || 3000;

const app = express();

// Middleware CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

app.options('*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.status(204).end();
});

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- CONFIGURAÇÃO DO BANCO DE DADOS PARA RAILWAY ---
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ ERRO: A variável DATABASE_URL não foi encontrada!");
    console.error("Verifique as 'Variables' no painel do Railway.");
    process.exit(1);
}

const client = new Client({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false // Obrigatório para Railway/Render
    }
});

// Conectar ao Banco
client.connect(err => {
    if (err) {
        console.error('❌ Erro ao conectar no banco:', err);
        process.exit(1);
    } else {
        console.log('✅ Conectado ao PostgreSQL do Railway');
        
        // Criar tabelas após conectar
        criarTabelas();
    }
});

// Função para criar as tabelas
async function criarTabelas() {
    try {
        // Tabela coletores (ATUALIZADA para incluir headset)
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
        `);
        console.log('✅ Tabela "coletores" pronta.');

        // Tabela colaboradores
        await client.query(`
            CREATE TABLE IF NOT EXISTS colaboradores (
                id SERIAL PRIMARY KEY,
                matricula VARCHAR(255) NOT NULL,
                nome VARCHAR(255) NOT NULL,
                turno VARCHAR(255) NOT NULL,
                setor VARCHAR(255) NOT NULL
            );
        `);
        console.log('✅ Tabela "colaboradores" pronta.');

        // Tabela equipamentos (ATUALIZADA com as novas colunas)
        await client.query(`
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
        console.log('✅ Tabela "equipamentos" pronta.');

        // Tabela historico_quebras (se for usar)
        await client.query(`
            CREATE TABLE IF NOT EXISTS historico_quebras (
                id SERIAL PRIMARY KEY,
                coletor VARCHAR(255) NOT NULL,
                matricula_responsavel VARCHAR(255) NOT NULL,
                data TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ Tabela "historico_quebras" pronta.');

    } catch (err) {
        console.error('❌ Erro ao criar tabelas:', err);
    }
}

// --- SUAS APIS (NÃO MEXI EM NADA, SÓ CORRIGI A ROTA PENDENTES) ---

// ROTA DE CADASTRO COM VALIDAÇÕES DE SEGURANÇA
app.post('/api/cadastrar', async (req, res) => {
    const { matricula, coletor, turno, headset } = req.body;
    const data = new Date().toISOString().split('T')[0];

    try {
        // 1. VERIFICAÇÃO: O Colaborador existe?
        const colaboradorResult = await client.query(
            'SELECT nome FROM colaboradores WHERE matricula = $1', 
            [matricula]
        );
        
        if (colaboradorResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Colaborador não encontrado. Cadastre o colaborador primeiro.' 
            });
        }
        const nomeColaborador = colaboradorResult.rows[0].nome;

        // 2. VERIFICAÇÃO: O Coletor existe na base de equipamentos e qual o status?
        const equipamentoResult = await client.query(
            'SELECT condicao FROM equipamentos WHERE identificador = $1 OR numero = $1',
            [coletor]
        );

        if (equipamentoResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Este coletor não existe na base de equipamentos cadastrados.'
            });
        }

        // 3. VERIFICAÇÃO: O Coletor está quebrado?
        const condicao = equipamentoResult.rows[0].condicao.toLowerCase();
        if (condicao.includes('quebrado')) {
            return res.status(400).json({
                success: false,
                message: 'Por favor verificar: este coletor está com status QUEBRADO no sistema.'
            });
        }

        // 4. BAIXA AUTOMÁTICA: Se o coletor estava com outra pessoa, libera ele
        const coletorPendenteResult = await client.query(
            "SELECT id FROM coletores WHERE coletor = $1 AND status = 'Pendente'",
            [coletor]
        );

        if (coletorPendenteResult.rows.length > 0) {
            await client.query(
                "UPDATE coletores SET status = 'Devolvido', data_expiracao = NOW() WHERE coletor = $1 AND status = 'Pendente'",
                [coletor]
            );
            console.log(`Baixa automática realizada para o coletor: ${coletor}`);
        }

        // 5. FINALMENTE: Realiza o novo cadastro
        const insertResult = await client.query(
            `INSERT INTO coletores 
            (matricula, coletor, turno, data, status, headset, nome_colaborador) 
            VALUES ($1, $2, $3, $4, 'Pendente', $5, $6) 
            RETURNING *`,
            [matricula, coletor, turno, data, headset, nomeColaborador]
        );

        res.status(201).json({
            success: true,
            message: 'Coletor cadastrado com sucesso.',
            data: insertResult.rows[0]
        });

    } catch (error) {
        console.error('Erro no cadastro:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno ao processar cadastro.',
            error: error.message 
        });
    }
});

app.get('/api/coletores', async (req, res) => {
    try {
        const result = await client.query(`
            SELECT c.*, col.nome as nome_colaborador 
            FROM coletores c
            LEFT JOIN colaboradores col ON c.matricula = col.matricula
            ORDER BY c.data DESC, c.id DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar coletores:', error);
        res.status(500).json({ error: 'Erro ao buscar dados' });
    }
});

app.post('/api/cadastrarEquipamento', async (req, res) => {
    const { idPulsus, identificador, patrimonio, numero, condicao, tipo_equipamento, propriedade } = req.body;

    try {
        await client.query(
            'INSERT INTO equipamentos (id_pulsus, identificador, patrimonio, numero, condicao, tipo_equipamento, propriedade) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [idPulsus, identificador, patrimonio, numero, condicao, tipo_equipamento, propriedade]
        );
        res.status(201).json({ message: 'Equipamento cadastrado com sucesso.' });
    } catch (error) {
        console.error('Erro ao cadastrar equipamento:', error);
        res.status(500).json({ message: 'Erro ao cadastrar equipamento.' });
    }
});

app.put('/api/editarEquipamento/:id', async (req, res) => {
    const { id } = req.params;
    const { idPulsus, identificador, patrimonio, numero, condicao, tipo_equipamento, propriedade } = req.body;

    try {
        await client.query(
            `UPDATE equipamentos 
             SET id_pulsus = $1, identificador = $2, patrimonio = $3, numero = $4, condicao = $5, tipo_equipamento = $6, propriedade = $7 
             WHERE id_pulsus = $8`,
            [idPulsus, identificador, patrimonio, numero, condicao, tipo_equipamento, propriedade, id]
        );
        res.json({ message: 'Equipamento atualizado com sucesso.' });
    } catch (error) {
        console.error('Erro ao editar:', error);
        res.status(500).json({ message: 'Erro ao editar equipamento.' });
    }
});

app.delete('/api/excluirEquipamento/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await client.query('DELETE FROM equipamentos WHERE id_pulsus = $1', [id]);
        res.json({ message: 'Equipamento excluído com sucesso.' });
    } catch (error) {
        console.error('Erro ao excluir:', error);
        res.status(500).json({ message: 'Erro ao excluir equipamento.' });
    }
});

app.get('/api/stats-por-setor', async (req, res) => {
    try {
        const query = `
            SELECT c.setor, COUNT(e.id) as total 
            FROM equipamentos e
            JOIN colaboradores c ON e.colaborador_id = c.id
            WHERE e.condicao = 'Operando'
            GROUP BY c.setor
        `;
        const result = await client.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/equipamentos', async (req, res) => {
    try {
        let query = 'SELECT * FROM equipamentos WHERE 1=1';
        const params = [];
        
        if (req.query.id_pulsus) {
            query += ' AND id_pulsus ILIKE $' + (params.length + 1);
            params.push(`%${req.query.id_pulsus}%`);
        }
        if (req.query.identificador) {
            query += ' AND identificador ILIKE $' + (params.length + 1);
            params.push(`%${req.query.identificador}%`);
        }
        if (req.query.patrimonio) {
            query += ' AND patrimonio ILIKE $' + (params.length + 1);
            params.push(`%${req.query.patrimonio}%`);
        }
        if (req.query.condicao) {
            query += ' AND condicao = $' + (params.length + 1);
            params.push(req.query.condicao);
        }
        
        const result = await client.query(query, params);
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
        res.status(500).json({ message: 'Erro ao cadastrar colaborador: ' + error.message });
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

app.post('/api/alterarStatus', async (req, res) => {
    const { coletor, novoStatus, matriculaResponsavel } = req.body;

    if (!coletor || !novoStatus || (novoStatus === 'Quebrado' && !matriculaResponsavel)) {
        return res.status(400).json({ error: 'Dados inválidos' });
    }

    try {
        await client.query('BEGIN');

        const updateResult = await client.query(
            `UPDATE equipamentos 
            SET condicao = $1, 
                responsavel = $2
            WHERE numero = $3
            RETURNING *`,
            [
                novoStatus,
                novoStatus === 'Quebrado' ? matriculaResponsavel : null,
                coletor
            ]
        );

        if (novoStatus === 'Quebrado') {
            await client.query(
                `INSERT INTO historico_quebras 
                (coletor, matricula_responsavel, data) 
                VALUES ($1, $2, NOW())`,
                [coletor, matriculaResponsavel]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, data: updateResult.rows[0] });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro detalhado:', {
            message: error.message,
            query: error.query,
            parameters: error.parameters
        });
        res.status(500).json({ 
            error: 'Erro ao atualizar status',
            details: error.message
        });
    }
});

app.post('/api/devolver', async (req, res) => {
    const { coletor } = req.body;

    if (!coletor) {
        return res.status(400).json({ message: 'Campo coletor é obrigatório.' });
    }

    try {
        const result = await client.query(
            `UPDATE coletores SET status = 'Devolvido', data_expiracao = NOW() + INTERVAL '4 days' WHERE coletor = $1 AND status = 'Pendente'`,
            [coletor]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: `Coletor "${coletor}" não encontrado ou já devolvido.` });
        }

        res.json({ success: true, message: 'Coletor devolvido com sucesso.' });
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

app.put('/api/colaboradores/:matricula', async (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'PUT');
    
    try {
        const { matricula } = req.params;
        const { nome, turno, setor } = req.body;

        const result = await client.query(
            'UPDATE colaboradores SET nome = $1, turno = $2, setor = $3 WHERE matricula = $4 RETURNING *',
            [nome, turno, setor, matricula]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Colaborador não encontrado' 
            });
        }
        
        res.json({
            success: true,
            message: 'Colaborador atualizado com sucesso',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao atualizar colaborador:', error);
        res.status(500).json({ 
            success: false,
            message: 'Erro ao atualizar colaborador',
            error: error.message 
        });
    }
});

app.delete('/api/colaboradores/:matricula', async (req, res) => {
    console.log(`Tentando excluir matrícula: ${req.params.matricula}`);
    
    try {
        const checkResult = await client.query(
            'SELECT * FROM colaboradores WHERE matricula = $1', 
            [req.params.matricula]
        );
        
        if (checkResult.rowCount === 0) {
            console.log('Colaborador não encontrado');
            return res.status(404).json({
                success: false,
                message: 'Colaborador não encontrado'
            });
        }

        const deleteResult = await client.query(
            'DELETE FROM colaboradores WHERE matricula = $1 RETURNING *',
            [req.params.matricula]
        );

        console.log('Exclusão bem-sucedida:', deleteResult.rows[0]);
        
        res.json({
            success: true,
            message: 'Colaborador excluído com sucesso',
            data: deleteResult.rows[0]
        });
        
    } catch (error) {
        console.error('Erro no servidor:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno ao excluir colaborador',
            error: error.message
        });
    }
});

app.get('/api/verificarColaborador', async (req, res) => {
    const { matricula } = req.query;
    
    try {
        const result = await client.query(
            'SELECT nome FROM colaboradores WHERE matricula = $1', 
            [matricula] 
        );
        
        res.json({
            encontrado: result.rows.length > 0,
            nome: result.rows[0]?.nome || ''
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ROTA PENDENTES CORRIGIDA
app.get('/api/pendentes', async (req, res) => {
    try {
        const query = `
            SELECT 
                c.coletor, 
                c.matricula, 
                c.turno,
                c.data AS data_hora,
                col.nome AS nome 
            FROM coletores c
            LEFT JOIN colaboradores col ON c.matricula = col.matricula 
            WHERE c.status = 'Pendente'
            ORDER BY c.data DESC`;
        
        const result = await client.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('ERRO NO SERVIDOR:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Rota para o Frontend (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
