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

    async function atualizarContadores() {
        try {
            const response = await fetch(`${API_URL}/contagem-status`);
            if (!response.ok) {
                throw new Error(`Erro ao obter contagem: ${response.status}`);
            }
            const data = await response.json();
            console.log('Dados recebidos para atualizar contadores:', data);
            const coletorOperando = document.getElementById('coletor-operando');
            const coletorQuebrado = document.getElementById('coletor-quebrado');
            if (coletorOperando) {
                coletorOperando.textContent = data.operando;
            } else {
                console.error('Elemento coletor-operando não encontrado.');
            }
            if (coletorQuebrado) {
                coletorQuebrado.textContent = data.quebrado;
            } else {
                console.error('Elemento coletor-quebrado não encontrado.');
            }
        } catch (error) {
            console.error('Erro ao atualizar contadores:', error);
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
            const coletorData = await registerCollector(matricula, coletor, turno, headset);
            showMessage('Coletor cadastrado com sucesso!', 'success');
        } catch (error) {
            showMessage(error.message, 'error');
            return;
        }

        matriculaInput.value = '';
        coletorInput.value = '';
        if (headsetInput) headsetInput.value = '';
    });

    const colaboradorForm = document.getElementById('colaboradorForm');
    const matriculaColaboradorInput = document.getElementById('matriculaColaborador');
    const nomeColaboradorInput = document.getElementById('nomeColaborador');
    const turnoColaboradorSelect = document.getElementById('turnoColaborador');
    const setorColaboradorSelect = document.getElementById('setorColaborador');

    colaboradorForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const matricula = matriculaColaboradorInput.value.trim();
        const nome = nomeColaboradorInput.value.trim();
        const turno = turnoColaboradorSelect.value;
        const setor = setorColaboradorSelect.value;

        try {
            const response = await fetch(`${API_URL}/cadastrarColaborador`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matricula, nome, turno, setor }),
            });

            if (!response.ok) {
                throw new Error(`Erro ${response.status} ao cadastrar colaborador.`);
            }

            showMessage('Colaborador cadastrado com sucesso!', 'success');
            modal.style.display = "none";

            // Reseta os inputs do modal
            matriculaColaboradorInput.value = '';
            nomeColaboradorInput.value = '';
            turnoColaboradorSelect.value = '';
            setorColaboradorSelect.value = '';

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