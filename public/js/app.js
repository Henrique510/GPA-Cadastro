document.addEventListener("DOMContentLoaded", () => {
    const API_URL = 'http://localhost:3001/api';
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
            const coletorData = await registerCollector(matricula, coletor, turno);
        } catch (error) {
            showMessage(error.message, 'error');
            return;
        }
        
        if (headset) {
            try {
                const headsetData = await registerHeadset(matricula, headset);
            } catch (error) {
                showMessage(error.message, 'error');
            }
        }
    
        matriculaInput.value = '';
        coletorInput.value = '';
        if (headsetInput) headsetInput.value = '';
    });

    async function registerCollector(matricula, coletor, turno) {
        try {
            const response = await fetch(`${API_URL}/cadastrarColetor`, { // Rota específica para coletor
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matricula, coletor, turno }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Erro ${response.status} ao cadastrar coletor.`);
            }

            return response.json();
        } catch (error) {
            console.error('Erro no cadastro de coletor:', error);
            throw error;
        }
    }

    async function registerHeadset(matricula, headset) {
        try {
            const response = await fetch(`${API_URL}/cadastrarHeadset`, { // Rota específica para headset
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matricula, headset }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Erro ${response.status} ao cadastrar headset.`);
            }

            return response.json();
        } catch (error) {
            console.error('Erro no cadastro de headset:', error);
            throw error;
        }
    }

    devolverButton.addEventListener('click', async () => {
        const coletor = devolucaoInput.value.trim();
        if (!coletor) {
            showMessage('Informe o coletor para devolução!', 'error');
            return;
        }
        try {
            const data = await devolveCollector(coletor);
            devolucaoInput.value = '';
            console.log('Devolução do coletor realizada com sucesso!');
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
