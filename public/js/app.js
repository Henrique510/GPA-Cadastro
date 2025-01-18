document.addEventListener("DOMContentLoaded", () => {
    const API_URL = 'https://gpa-cadastro.onrender.com/api';
    const userForm = document.getElementById('userForm');
    const devolucaoInput = document.getElementById('devolucaoColetor');
    const devolverButton = document.getElementById('devolver');
    const messageContainer = document.getElementById('messageContainer');
    const devolucaoSection = document.getElementById('devolucaoSection');
    const devolucaoTitle = document.getElementById('devolucaoTitle');

    // Inicialmente oculta a seção de devolução
    devolucaoSection.style.display = 'none';

    // Forçar entrada em maiúsculas
    document.getElementById('matricula').addEventListener('input', (e) => e.target.value = e.target.value.toUpperCase());
    document.getElementById('coletor').addEventListener('input', (e) => e.target.value = e.target.value.toUpperCase());
    devolucaoInput.addEventListener('input', (e) => e.target.value = e.target.value.toUpperCase());

    // Mostrar/Esconder seção de devolução
    devolucaoTitle.addEventListener('click', () => {
        devolucaoSection.style.display = devolucaoSection.style.display === 'none' ? 'block' : 'none';
    });

    function showMessage(message, type = 'success', duration = 3000) {
        messageContainer.textContent = message;
        messageContainer.style.backgroundColor = type === 'success' ? 'green' : 'red';
        messageContainer.style.color = 'white';
        messageContainer.style.display = 'block';

        setTimeout(() => {
            messageContainer.style.display = 'none';
        }, duration);
    }

    async function registerCollector(matricula, coletor, turno) {
        try {
            const response = await fetch(`${API_URL}/cadastrar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matricula, coletor, turno }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Erro ${response.status} ao cadastrar.`);
            }
            return response.json(); // Retorna os dados do JSON
        } catch (error) {
            console.error('Erro no cadastro:', error);
            throw error;
        }
    }

    async function devolveCollector(coletor) {
        try {
            const response = await fetch(`${API_URL}/devolver`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ coletor }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Erro ${response.status} ao devolver.`);
            }
            return response.json();// Retorna os dados do JSON
        } catch (error) {
            console.error('Erro na devolução:', error);
            throw error;
        }
    }

    userForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const matricula = document.getElementById('matricula').value.trim();
        const coletor = document.getElementById('coletor').value.trim();
        const turno = document.getElementById('turno').value;

        if (!matricula || !coletor || !turno) {
            showMessage('Todos os campos são obrigatórios!', 'error');
            return;
        }

        try {
            const data = await registerCollector(matricula, coletor, turno);
            document.getElementById('matricula').value = '';
            document.getElementById('coletor').value = '';
            showMessage(data.message || 'Coletor cadastrado com sucesso!');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    devolverButton.addEventListener('click', async () => {
        const coletor = devolucaoInput.value.trim();
        if (!coletor) {
            showMessage('Informe o coletor para devolução!', 'error');
            return;
        }

        try {
            const data = await devolveCollector(coletor);
            devolucaoInput.value = '';
            showMessage(data.message || 'Coletor devolvido com sucesso!');
            window.location.href = 'dashboard.html';
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });
});