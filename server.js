const express = require('express');
const Database = require('better-sqlite3');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configurar o banco SQLite com better-sqlite3
const db = new Database('./atmn.db', { verbose: console.log });

// Criar tabela, se não existir
db.prepare(`CREATE TABLE IF NOT EXISTS coletores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matricula TEXT NOT NULL,
    coletor TEXT NOT NULL UNIQUE,
    turno TEXT NOT NULL,
    data TEXT NOT NULL
)`).run();

// Rotas (API)
app.post('/api/cadastrar', (req, res) => {
    const { matricula, coletor, turno } = req.body;
    const data = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');

    if (!matricula || !coletor || !turno) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios!' });
    }

    const stmt = db.prepare(`INSERT OR REPLACE INTO coletores (matricula, coletor, turno, data) VALUES (?, ?, ?, ?)`);
    try {
        stmt.run(matricula, coletor, turno, data);
        res.sendStatus(200); // Sucesso sem mensagem
    } catch (err) {
        console.error('Erro ao cadastrar coletor:', err);
        res.status(500).json({ message: 'Erro ao cadastrar o coletor!' });
    }
});

app.post('/api/devolver', (req, res) => {
    const { coletor } = req.body;

    if (!coletor) {
        return res.status(400).json({ message: 'O coletor é obrigatório!' });
    }

    const stmt = db.prepare(`DELETE FROM coletores WHERE coletor = ?`);
    try {
        stmt.run(coletor);
        res.status(200).json({ message: 'Coletor devolvido com sucesso!' });
    } catch (err) {
        console.error('Erro ao devolver coletor:', err);
        res.status(500).json({ message: 'Erro ao devolver o coletor!' });
    }
});

app.get('/api/coletores', (req, res) => {
    try {
        const rows = db.prepare(`SELECT * FROM coletores`).all();
        res.status(200).json(rows);
    } catch (err) {
        console.error('Erro ao listar coletores:', err);
        res.status(500).json({ message: 'Erro ao obter a lista de coletores!' });
    }
});

// Servir o index.html na rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
