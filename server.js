const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configurar o banco SQLite
const db = new sqlite3.Database('./atmn.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao SQLite:', err);
    } else {
        console.log('Conectado ao SQLite');
        db.run(`CREATE TABLE IF NOT EXISTS coletores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            matricula TEXT NOT NULL,
            coletor TEXT NOT NULL UNIQUE,
            turno TEXT NOT NULL,
            data TEXT NOT NULL
        )`);
    }
});

// Rotas (API)
app.post('/api/cadastrar', (req, res) => {
    const { matricula, coletor, turno } = req.body;
    const data = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');


    if (!matricula || !coletor || !turno) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios!' });
    }

    db.run(`INSERT OR REPLACE INTO coletores (matricula, coletor, turno, data) VALUES (?, ?, ?, ?)`,
        [matricula, coletor, turno, data],
        function (err) {
            if (err) {
                console.error('Erro ao cadastrar coletor:', err);
                res.status(500).json({ message: 'Erro ao cadastrar o coletor!' });
            } else {
                res.sendStatus(200); // Sucesso sem mensagem
            }
        });
});


app.post('/api/devolver', (req, res) => {
    const { coletor } = req.body;

    if (!coletor) {
        return res.status(400).json({ message: 'O coletor é obrigatório!' });
    }

    db.run(`DELETE FROM coletores WHERE coletor = ?`, [coletor], function (err) {
        if (err) {
            console.error('Erro ao devolver coletor:', err);
            res.status(500).json({ message: 'Erro ao devolver o coletor!' });
        } else {
            res.status(200).json({ message: 'Coletor devolvido com sucesso!' });
        }
    });
});

app.get('/api/coletores', (req, res) => {
    db.all(`SELECT * FROM coletores`, [], (err, rows) => {
        if (err) {
            console.error('Erro ao listar coletores:', err);
            res.status(500).json({ message: 'Erro ao obter a lista de coletores!' });
        } else {
            res.status(200).json(rows);
        }
    });
});

// Servir o index.html na rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
