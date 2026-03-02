require('dotenv').config();
const express = require('express');
const { Client } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const PORT = process.env.PORT || 3000;

const app = express();

// Middleware CORS - MAIS PERMISSIVO PARA RAILWAY
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
}));

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- CONFIGURAÇÃO DO BANCO DE DADOS PARA RAILWAY ---
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ ERRO: A variável DATABASE_URL não foi encontrada!");
    console.error("Verifique as 'Variables' no painel do Railway.");
    process.exit(1);
}

console.log("🔄 Conectando ao PostgreSQL...");

const client = new Client({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

// Variável global para verificar se o banco está conectado
let dbConnected = false;

// Conectar ao Banco com tratamento de erro robusto
client.connect()
    .then(() => {
        console.log('✅ Conectado ao PostgreSQL do Railway');
        dbConnected = true;
        // Criar tabelas após conectar
        return criarTabelas();
    })
    .catch(err => {
        console.error('❌ Erro ao conectar no banco:', err.message);
        console.log('🔄 O servidor continuará rodando, mas as rotas de banco falharão');
        // Não encerra o processo para o Railway não reiniciar em loop
    });

// Função para criar as tabelas
async function criarTabelas() {
    try {
        // Tabela coletores
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
                matricula VARCHAR(255) NOT NULL UNIQUE,
                nome VARCHAR(255) NOT NULL,
                turno VARCHAR(255) NOT NULL,
                setor VARCHAR(255) NOT NULL
            );
        `);
        console.log('✅ Tabela "colaboradores" pronta.');

        // Tabela equipamentos
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

        // Tabela historico_quebras
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
        console.error('❌ Erro ao criar tabelas:', err.message);
    }
}

// Middleware para verificar conexão com banco
const checkDbConnection = (req, res, next) => {
    if (!dbConnected) {
        return res.status(503).json({ 
            error: 'Banco de dados não conectado',
            message: 'O servidor está inicializando ou houve erro na conexão. Tente novamente em alguns segundos.'
        });
    }
    next();
};

// Aplicar middleware em todas as rotas de API (exceto health check)
app.use('/api', checkDbConnection);

// Rota de health check (não precisa de banco)
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: dbConnected ? 'connected' : 'disconnected',
        port: PORT
    });
});

// Rota raiz para teste
app.get('/', (req, res) => {
    res.json({
        message: 'API do GPA Cadastro',
        status: 'online',
        database: dbConnected ? 'connected' : 'disconnected',
        endpoints: [
            '/api/colaboradores',
            '/api/equipamentos',
            '/api/coletores',
            '/api/pendentes',
            '/health'
        ]
    });
});

// --- SUAS ROTAS (com checkDbConnection já aplicado) ---

// Rota para buscar colaboradores
app.get('/api/colaboradores', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM colaboradores ORDER BY nome');
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar colaboradores:', error);
        res.status(500).json({ error: 'Erro ao buscar colaboradores' });
    }
});

// Rota para cadastrar colaborador
app.post('/api/cadastrarColaborador', async (req, res) => {
    const { matricula, nome, turno, setor } = req.body;

    // Validação básica
    if (!matricula || !nome || !turno || !setor) {
        return res.status(400).json({ 
            message: 'Todos os campos são obrigatórios' 
        });
    }

    try {
        // Verificar se matrícula já existe
        const checkResult = await client.query(
            'SELECT * FROM colaboradores WHERE matricula = $1',
            [matricula]
        );

        if (checkResult.rows.length > 0) {
            return res.status(400).json({ 
                message: 'Matrícula já cadastrada' 
            });
        }

        const result = await client.query(
            'INSERT INTO colaboradores (matricula, nome, turno, setor) VALUES ($1, $2, $3, $4) RETURNING *',
            [matricula, nome, turno, setor]
        );
        
        res.status(201).json({ 
            message: 'Colaborador cadastrado com sucesso',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao cadastrar colaborador:', error);
        res.status(500).json({ 
            message: 'Erro ao cadastrar colaborador: ' + error.message 
        });
    }
});

// Rota para atualizar colaborador
app.put('/api/colaboradores/:matricula', async (req, res) => {
    const { matricula } = req.params;
    const { nome, turno, setor } = req.body;

    try {
        const result = await client.query(
            'UPDATE colaboradores SET nome = $1, turno = $2, setor = $3 WHERE matricula = $4 RETURNING *',
            [nome, turno, setor, matricula]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ 
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
            message: 'Erro ao atualizar colaborador' 
        });
    }
});

// Rota para deletar colaborador
app.delete('/api/colaboradores/:matricula', async (req, res) => {
    const { matricula } = req.params;
    
    try {
        // Verificar se existe
        const checkResult = await client.query(
            'SELECT * FROM colaboradores WHERE matricula = $1',
            [matricula]
        );
        
        if (checkResult.rowCount === 0) {
            return res.status(404).json({
                message: 'Colaborador não encontrado'
            });
        }

        // Verificar se tem empréstimos pendentes
        const emprestimosResult = await client.query(
            "SELECT * FROM coletores WHERE matricula = $1 AND status = 'Pendente'",
            [matricula]
        );

        if (emprestimosResult.rows.length > 0) {
            return res.status(400).json({
                message: 'Colaborador possui empréstimos pendentes. Devolva os equipamentos primeiro.'
            });
        }

        const deleteResult = await client.query(
            'DELETE FROM colaboradores WHERE matricula = $1 RETURNING *',
            [matricula]
        );

        res.json({
            success: true,
            message: 'Colaborador excluído com sucesso',
            data: deleteResult.rows[0]
        });
        
    } catch (error) {
        console.error('Erro ao excluir colaborador:', error);
        res.status(500).json({
            message: 'Erro interno ao excluir colaborador'
        });
    }
});

// Rota para buscar equipamentos
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
        
        query += ' ORDER BY id DESC';
        
        const result = await client.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar equipamentos:', error);
        res.status(500).json({ error: 'Erro ao buscar equipamentos' });
    }
});

// Rota para cadastrar equipamento
app.post('/api/cadastrarEquipamento', async (req, res) => {
    const { idPulsus, identificador, patrimonio, numero, condicao, tipo_equipamento, propriedade } = req.body;

    if (!identificador || !condicao) {
        return res.status(400).json({ message: 'Identificador e condição são obrigatórios' });
    }

    try {
        const result = await client.query(
            'INSERT INTO equipamentos (id_pulsus, identificador, patrimonio, numero, condicao, tipo_equipamento, propriedade) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [idPulsus, identificador, patrimonio, numero, condicao, tipo_equipamento, propriedade]
        );
        res.status(201).json({ 
            message: 'Equipamento cadastrado com sucesso',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao cadastrar equipamento:', error);
        res.status(500).json({ message: 'Erro ao cadastrar equipamento' });
    }
});

// Rota para cadastrar empréstimo
app.post('/api/cadastrar', async (req, res) => {
    const { matricula, coletor, turno, headset } = req.body;
    const data = new Date().toISOString().split('T')[0];

    if (!matricula || !coletor || !turno) {
        return res.status(400).json({ 
            success: false,
            message: 'Matrícula, coletor e turno são obrigatórios.' 
        });
    }

    try {
        // Verificar se colaborador existe
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

        // Verificar se equipamento existe
        const equipamentoResult = await client.query(
            'SELECT condicao FROM equipamentos WHERE identificador = $1 OR numero = $1',
            [coletor]
        );

        if (equipamentoResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Este coletor não existe na base de equipamentos.'
            });
        }

        // Verificar se está quebrado
        const condicao = equipamentoResult.rows[0].condicao.toLowerCase();
        if (condicao.includes('quebrado')) {
            return res.status(400).json({
                success: false,
                message: 'Este coletor está com status QUEBRADO no sistema.'
            });
        }

        // Dar baixa em pendências anteriores
        await client.query(
            "UPDATE coletores SET status = 'Devolvido', data_expiracao = NOW() WHERE coletor = $1 AND status = 'Pendente'",
            [coletor]
        );

        // Inserir novo empréstimo
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
            message: 'Erro interno ao processar cadastro.'
        });
    }
});

// Rota para listar pendentes
app.get('/api/pendentes', async (req, res) => {
    try {
        const result = await client.query(`
            SELECT 
                c.coletor, 
                c.matricula, 
                c.turno,
                c.data AS data_hora,
                c.nome_colaborador AS nome 
            FROM coletores c
            WHERE c.status = 'Pendente'
            ORDER BY c.data DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar pendentes:', error);
        res.status(500).json({ error: 'Erro ao buscar pendentes' });
    }
});

// Rota para devolver coletor
app.post('/api/devolver', async (req, res) => {
    const { coletor } = req.body;

    if (!coletor) {
        return res.status(400).json({ message: 'Campo coletor é obrigatório.' });
    }

    try {
        const result = await client.query(
            `UPDATE coletores SET status = 'Devolvido', data_expiracao = NOW() WHERE coletor = $1 AND status = 'Pendente' RETURNING *`,
            [coletor]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: `Coletor "${coletor}" não encontrado ou já devolvido.` });
        }

        res.json({ 
            success: true, 
            message: 'Coletor devolvido com sucesso.',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao devolver coletor:', error);
        res.status(500).json({ message: 'Erro ao devolver.' });
    }
});

// Rota para contagem de status
app.get('/api/contagem-status', async (req, res) => {
    try {
        const result = await client.query(`
            SELECT 
                COUNT(CASE WHEN condicao = 'Operando' THEN 1 END) AS operando,
                COUNT(CASE WHEN condicao = 'Quebrado' THEN 1 END) AS quebrado
            FROM equipamentos
        `);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro na contagem:', error);
        res.status(500).json({ operando: 0, quebrado: 0 });
    }
});

// Rota para contagens de coletores
app.get('/api/contagens', async (req, res) => {
    try {
        const result = await client.query(`
            SELECT
                COUNT(DISTINCT CASE WHEN coletor LIKE 'Z%' AND status = 'Pendente' THEN coletor END) AS Z,
                COUNT(DISTINCT CASE WHEN coletor LIKE 'C%' AND status = 'Pendente' THEN coletor END) AS C,
                COUNT(DISTINCT CASE WHEN coletor LIKE 'T%' AND status = 'Pendente' THEN coletor END) AS T
            FROM coletores;
        `);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro nas contagens:', error);
        res.status(500).json({ Z: 0, C: 0, T: 0 });
    }
});

// Rota para verificar colaborador
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
        console.error('Erro ao verificar colaborador:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para servir o frontend (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Tratamento de erros global
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

// Iniciar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Acesse: http://localhost:${PORT}`);
    console.log(`🔍 Health check: http://localhost:${PORT}/health`);
});

// Tratamento de sinais para encerramento gracioso
process.on('SIGTERM', () => {
    console.log('🛑 Recebido SIGTERM, encerrando graciosamente...');
    server.close(() => {
        console.log('✅ Servidor encerrado');
        if (dbConnected) {
            client.end().then(() => {
                console.log('✅ Conexão com banco encerrada');
                process.exit(0);
            }).catch(() => process.exit(0));
        } else {
            process.exit(0);
        }
    });
});

process.on('SIGINT', () => {
    console.log('🛑 Recebido SIGINT, encerrando graciosamente...');
    server.close(() => {
        console.log('✅ Servidor encerrado');
        if (dbConnected) {
            client.end().then(() => {
                console.log('✅ Conexão com banco encerrada');
                process.exit(0);
            }).catch(() => process.exit(0));
        } else {
            process.exit(0);
        }
    });
});
