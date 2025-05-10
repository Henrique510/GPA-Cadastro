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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    preflightContinue: false, // Importante para o tratamento correto do OPTIONS
    optionsSuccessStatus: 204
}));

// Handler explícito para OPTIONS (deve vir antes das rotas)
app.options('*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.status(204).end();
});



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

app.get('/api/coletores', async (req, res) => {
    try {
        const result = await client.query(`
            SELECT c.*, col.nome as nome_colaborador 
            FROM coletores c
            LEFT JOIN colaboradores col ON c.matricula = col.matricula
            ORDER BY c.data DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar coletores:', error);
        res.status(500).json({ error: 'Erro ao buscar dados' });
    }
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
app.post('/api/alterarStatus', async (req, res) => {
    const { coletor, novoStatus, matriculaResponsavel } = req.body;

    // Validação dos dados
    if (!coletor || !novoStatus || (novoStatus === 'Quebrado' && !matriculaResponsavel)) {
        return res.status(400).json({ error: 'Dados inválidos' });
    }

    try {
        await client.query('BEGIN'); // Inicia transação

        // 1. Atualiza o equipamento
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

        // 2. Se quebrado, registra no histórico
        if (novoStatus === 'Quebrado') {
            await client.query(
                `INSERT INTO historico_quebras 
                 (coletor, matricula_responsavel, data) 
                 VALUES ($1, $2, NOW())`,  // Corrigido - fechei o parêntese corretamente
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

app.put('/api/colaboradores/:matricula', async (req, res) => {
    // Adicione headers manualmente para garantir
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

// Rota para excluir colaborador
app.delete('/api/colaboradores/:matricula', async (req, res) => {
    console.log(`Tentando excluir matrícula: ${req.params.matricula}`); // Log para diagnóstico
    
    try {
        // 1. Verifica se o colaborador existe
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

        // 2. Executa a exclusão
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

app.delete('/api/colaboradores/:matricula', async (req, res) => {
    const { matricula } = req.params;
    
    try {
        // Primeiro obtém o colaborador que será excluído
        const colaborador = await client.query(
            'SELECT * FROM colaboradores WHERE matricula = $1',
            [matricula]
        );
        
        if (colaborador.rowCount === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Colaborador não encontrado' 
            });
        }

        // Depois executa a exclusão
        const result = await client.query(
            'DELETE FROM colaboradores WHERE matricula = $1',
            [matricula]
        );
        
        res.json({
            success: true,
            message: 'Colaborador excluído com sucesso',
            data: colaborador.rows[0]
        });
    } catch (error) {
        console.error('Erro ao excluir colaborador:', error);
        res.status(500).json({ 
            success: false,
            message: 'Erro ao excluir colaborador',
            error: error.message 
        });
    }
});
// Nova rota para verificar colaborador
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

// Modifique a rota de cadastro para incluir o nome
app.post('/api/cadastrar', async (req, res) => {
    const { matricula, coletor, turno, headset } = req.body;
    const data = new Date().toISOString().split('T')[0];

    try {
        // Primeiro busca o colaborador
        const colaborador = await client.query(
            'SELECT nome FROM colaboradores WHERE matricula = $1', 
            [matricula]
        );
        
        if (colaborador.rows.length === 0) {
            return res.status(404).json({ message: 'Colaborador não encontrado' });
        }

        const nomeColaborador = colaborador.rows[0].nome;

        // Depois insere com o nome
        const result = await client.query(
            `INSERT INTO coletores 
             (matricula, coletor, turno, data, status, headset, nome_colaborador) 
             VALUES ($1, $2, $3, $4, 'Pendente', $5, $6) 
             RETURNING *`,
            [matricula, coletor, turno, data, headset, nomeColaborador]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ error: error.message });
    }
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