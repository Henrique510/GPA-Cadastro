document.addEventListener("DOMContentLoaded", () => {
    // AJUSTE: O código agora identifica sozinho se está no Railway ou Localhost
    const API_URL = window.location.origin + '/api'; 

    const userForm = document.getElementById('userForm');
    const coletorInput = document.getElementById('coletor');
    const headsetInput = document.getElementById('headset');
    const matriculaInput = document.getElementById('matricula');
    // Removido turnoSelect pois foi retirado do HTML
    const devolucaoInput = document.getElementById('devolucaoColetor');
    const devolverButton = document.getElementById('devolver');
    const messageContainer = document.getElementById('messageContainer');
    const devolucaoSection = document.getElementById('devolucaoSection');
    const devolucaoTitle = document.getElementById('devolucaoTitle');
    const btnAbrir = document.getElementById("btnAdicionarUsuario");
    const modal = document.getElementById("modalCadastro");
    const btnFechar = document.querySelector(".close");

    if (devolucaoSection) devolucaoSection.style.display = 'none';

    // Formatação automática para Maiúsculas
    const inputsToUpper = [matriculaInput, coletorInput, devolucaoInput, headsetInput];
    inputsToUpper.forEach(input => {
        if (input) input.addEventListener('input', (e) => e.target.value = e.target.value.toUpperCase());
    });

    if (devolucaoTitle) {
        devolucaoTitle.addEventListener('click', () => {
            if (devolucaoSection) {
                devolucaoSection.style.display = devolucaoSection.style.display === 'none' ? 'block' : 'none';
            }
        });
    }

    function showMessage(message, type = 'success', duration = 3000) {
        if (!messageContainer) return;
        messageContainer.textContent = message;
        messageContainer.style.backgroundColor = type === 'success' ? 'green' : 'red';
        messageContainer.style.color = 'white';
        messageContainer.style.display = 'block';
        setTimeout(() => { messageContainer.style.display = 'none'; }, duration);
    }

    // Função de Devolução
    async function devolveCollector(coletor) {
        try {
            const response = await fetch(`${API_URL}/devolver`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ coletor }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Erro ao devolver');
            showMessage('Devolvido com sucesso!', 'success');
            return result;
        } catch (error) {
            showMessage(error.message, 'error');
            throw error;
        }
    }

    // Evento de Cadastro de Empréstimo
    if (userForm) {
        userForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitButton = userForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Processando...';

            const matricula = matriculaInput ? matriculaInput.value.trim() : '';
            const coletor = coletorInput ? coletorInput.value.trim() : '';
            const headset = headsetInput ? headsetInput.value.trim() : '';
            // Ajustado: define como vazio já que não tem mais no HTML
            const turno = "GERAL"; 

            if (!matricula || !coletor) {
                showMessage('Preencha Matrícula e Coletor.', 'error');
                submitButton.disabled = false;
                submitButton.textContent = 'Cadastrar';
                return;
            }

            try {
                // 1. Verifica Colaborador
                const verificaColab = await fetch(`${API_URL}/verificarColaborador?matricula=${matricula}`);
                const colabData = await verificaColab.json();
                
                if (!colabData.encontrado) {
                    showMessage('Colaborador não cadastrado!', 'error');
                    submitButton.disabled = false;
                    submitButton.textContent = 'Cadastrar';
                    return;
                }

                // 2. Realiza o Cadastro
                const response = await fetch(`${API_URL}/cadastrar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ matricula, coletor, turno, headset })
                });

                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Erro ao cadastrar');

                showMessage(result.message || 'Cadastrado com sucesso!', 'success');
                
                // Limpa campos
                if (matriculaInput) matriculaInput.value = '';
                if (coletorInput) coletorInput.value = '';
                if (headsetInput) headsetInput.value = '';
                
            } catch (error) {
                showMessage(error.message, 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Cadastrar';
            }
        });
    }

    // Cadastro de Novo Colaborador (Modal)
    const colaboradorForm = document.getElementById('colaboradorForm');
    if (colaboradorForm) {
        colaboradorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const matricula = document.getElementById('matriculaColaborador').value.trim();
            const nome = document.getElementById('nomeColaborador').value.trim();
            const setor = document.getElementById('setorColaborador').value;
            // Turno fixo vazio pois foi removido do HTML
            const turno = ""; 

            try {
                const response = await fetch(`${API_URL}/cadastrarColaborador`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ matricula, nome, turno, setor }),
                });

                if (!response.ok) throw new Error('Erro ao cadastrar colaborador.');

                showMessage('Colaborador cadastrado!', 'success');
                if (modal) modal.style.display = "none";
                colaboradorForm.reset();
            } catch (error) {
                showMessage(error.message, 'error');
            }
        });
    }

    // Botão de Devolução Manual
    if (devolverButton) {
        devolverButton.addEventListener('click', async () => {
            const coletor = devolucaoInput ? devolucaoInput.value.trim() : '';
            if (!coletor) return showMessage('Informe o coletor!', 'error');
            await devolveCollector(coletor);
            if (devolucaoInput) devolucaoInput.value = '';
        });
    }

    // Lógica do Modal
    if (btnAbrir) btnAbrir.onclick = () => modal.style.display = "block";
    if (btnFechar) btnFechar.onclick = () => modal.style.display = "none";
    window.onclick = (event) => { if (event.target === modal) modal.style.display = "none"; };

    // Verificação rápida de matrícula ao sair do campo
    if (matriculaInput) {
        matriculaInput.addEventListener('blur', async function() {
            const matricula = this.value.trim();
            if (matricula) {
                try {
                    const response = await fetch(`${API_URL}/verificarColaborador?matricula=${matricula}`);
                    const data = await response.json();
                    if (!data.encontrado) {
                        showMessage('Colaborador não encontrado no sistema!', 'error');
                    }
                } catch (e) { console.error('Erro na verificação'); }
            }
        });
    }
});
