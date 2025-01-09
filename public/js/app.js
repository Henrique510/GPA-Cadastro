document.addEventListener("DOMContentLoaded", () => {
    const API_URL = 'http://localhost:3001/api';
    const userForm = document.getElementById('userForm');
    const devolucaoInput = document.getElementById('devolucaoColetor');
    const devolverButton = document.getElementById('devolver');

    // Alterna a visibilidade da seção de devolução
    document.getElementById('devolucaoTitle').addEventListener('click', () => {
        const devolucaoSection = document.getElementById('devolucaoSection');
        devolucaoSection.style.display = devolucaoSection.style.display === 'none' ? 'block' : 'none';
    });

    // Função auxiliar para verificar se a resposta é JSON
    async function parseResponse(response) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return response.json();
        } else {
            return { message: await response.text() };
        }
    }

    // Cadastro de coletor
    userForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const matricula = document.getElementById('matricula').value.trim();
        const coletor = document.getElementById('coletor').value.trim();
        const turno = document.getElementById('turno').value;

        if (!matricula || !coletor || !turno) {
            alert('Todos os campos são obrigatórios!');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/cadastrar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matricula, coletor, turno }),
            });

            const data = await parseResponse(response);

            if (!response.ok) {
                alert(data.message || 'Erro ao cadastrar o coletor!');
            } else {
                document.getElementById('matricula').value = ''; // Limpa apenas matrícula
                document.getElementById('coletor').value = ''; // Limpa apenas coletor
            }
        } catch (err) {
            console.error('Erro ao cadastrar coletor:', err);
            alert('Erro ao cadastrar o coletor! Verifique o console para mais detalhes.');
        }
    });

    // Devolução de coletor
    devolverButton.addEventListener('click', async () => {
        const coletor = devolucaoInput.value.trim();

        if (!coletor) {
            alert('Informe o coletor para devolução!');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/devolver`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ coletor }),
            });

            const data = await parseResponse(response);

            if (response.ok) {
                alert(data.message || 'Devolução realizada com sucesso!');
                devolucaoInput.value = ''; // Limpa o campo após devolução
            } else {
                alert(data.message || 'Erro ao devolver o coletor!');
            }
        } catch (err) {
            console.error('Erro ao devolver coletor:', err);
            alert('Erro ao devolver o coletor! Verifique o console para mais detalhes.');
        }
    });
});
