document.addEventListener("DOMContentLoaded", () => {
    const API_URL = 'https://gpa-cadastro.onrender.com/api';
    const userForm = document.getElementById('userForm');
    const coletorInput = document.getElementById('coletor');
    const headsetInput = document.getElementById('headset');
    const matriculaInput = document.getElementById('matricula');
    const turnoSelect = document.getElementById('turno');
    const devolucaoInput = document.getElementById('devolucaoColetor');
    const devolverButton = document.getElementById('devolver');
    const messageContainer = document.getElementById('messageContainer');
    const devolucaoSection = document.getElementById('devolucaoSection');
    const devolucaoTitle = document.getElementById('devolucaoTitle');
    const btnAbrir = document.getElementById("btnAdicionarUsuario");
    const modal = document.getElementById("modalCadastro");
    const btnFechar = document.querySelector(".close");

    devolucaoSection.style.display = 'none';

    matriculaInput.addEventListener('input', (e) => e.target.value = e.target.value.toUpperCase());
    coletorInput.addEventListener('input', (e) => e.target.value = e.target.value.toUpperCase());
    devolucaoInput.addEventListener('input', (e) => e.target.value = e.target.value.toUpperCase());
    if (headsetInput) headsetInput.addEventListener('input', (e) => e.target.value = e.target.value.toUpperCase());

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

    async function registerCollector(matricula, coletor, turno, headset = '') {
        try {
            const response = await fetch(`${API_URL}/cadastrar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matricula, coletor, turno, headset }),
            });

            if (response.status === 409) {  
                const errorData = await response.json();
                throw new Error(errorData.message || 'Este coletor já está cadastrado.'); 
            } else if (!response.ok) { 
                const errorData = await response.json();
                throw new Error(errorData.message || `Erro ${response.status} ao cadastrar.`); 
            }

            return response.json(); 
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
            return response.json();
        } catch (error) {
            console.error('Erro na devolução:', error);
            throw error;
        }
    }

    userForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const matricula = matriculaInput.value.trim();
        const coletor = coletorInput.value.trim();
        const headset = headsetInput ? headsetInput.value.trim() : '';
        const turno = turnoSelect.value;

        if (!matricula || !coletor) { 
            showMessage('Preencha os campos obrigatórios (Matrícula e Coletor).', 'error');
            return; 
        }

        try {
            const data = await registerCollector(matricula, coletor, turno, headset); 
            matriculaInput.value = ''; 
            coletorInput.value = ''; 
            if (headsetInput) headsetInput.value = ''; 
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

    btnAbrir.addEventListener("click", function () {
        modal.style.display = "block";
    });

    btnFechar.addEventListener("click", function () {
        modal.style.display = "none";
    });

    window.addEventListener("click", function (event) {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });
});
