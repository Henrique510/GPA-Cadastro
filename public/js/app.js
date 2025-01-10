document.addEventListener("DOMContentLoaded", () => {
    const API_URL = 'https://gpa-cadastro.onrender.com/api';
    const userForm = document.getElementById('userForm');
    const devolucaoInput = document.getElementById('devolucaoColetor');
    const devolverButton = document.getElementById('devolver');
    const messageContainer = document.getElementById('messageContainer');

    // Forçar entrada em maiúsculas para matrícula, coletor e devolução
    document.getElementById('matricula').addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });

    document.getElementById('coletor').addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });

    devolucaoInput.addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });

    // Função para exibir mensagens
    function showMessage(message, type = 'success') {
        messageContainer.style.display = 'block';
        messageContainer.textContent = message;
        messageContainer.style.backgroundColor = type === 'success' ? 'green' : 'red';
        messageContainer.style.color = 'white';
    }

    // Alterna a visibilidade da seção de devolução
    document.getElementById('devolucaoTitle').addEventListener('click', () => {
        const devolucaoSection = document.getElementById('devolucaoSection');
        devolucaoSection.style.display = devolucaoSection.style.display === 'none' ? 'block' : 'none';
    });

    // Cadastro de coletor
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
            const response = await fetch(`${API_URL}/cadastrar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matricula, coletor, turno }),
            });

            const data = await response.json();

            if (!response.ok) {
                showMessage(data.message || 'Erro ao cadastrar o coletor!', 'error');
            } else {
                document.getElementById('matricula').value = ''; 
                document.getElementById('coletor').value = ''; 
                showMessage('Coletor cadastrado com sucesso!', 'success');
            }
        } catch (err) {
            console.error('Erro ao cadastrar coletor:', err);
            showMessage('Erro ao cadastrar o coletor! Verifique o console para mais detalhes.', 'error');
        }
    });

    // Devolução de coletor
    devolverButton.addEventListener('click', async () => {
        const coletor = devolucaoInput.value.trim();

        if (!coletor) {
            showMessage('Informe o coletor para devolução!', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/devolver`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ coletor }),
            });

            const data = await response.json();

            if (response.ok) {
                devolucaoInput.value = ''; // Limpa o campo de devolução após sucesso
            } else {
                showMessage(data.message || 'Erro ao devolver o coletor!', 'error');
            }
        } catch (err) {
            console.error('Erro ao devolver coletor:', err);
            showMessage('Erro ao devolver o coletor! Verifique o console para mais detalhes.', 'error');
        }
    });
});



