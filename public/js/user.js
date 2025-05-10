const API_URL = 'https://gpa-cadastro.onrender.com/api';
let colaboradores = [];
let modoEdicao = null;

// Carrega os colaboradores ao iniciar
document.addEventListener('DOMContentLoaded', carregarColaboradores);

async function carregarColaboradores() {
    try {
        const response = await fetch(`${API_URL}/colaboradores`);
        if (!response.ok) throw new Error('Erro ao carregar colaboradores');
        
        colaboradores = await response.json();
        exibirColaboradores(colaboradores);
    } catch (error) {
        console.error('Erro:', error);
        alert(error.message);
    }
}
function configurarFiltroMatricula() {
    const searchInput = document.getElementById('search-nome');
    const searchBtn = document.querySelector('.search-btn');
    
    if (!searchInput || !searchBtn) {
        console.error('Elementos do filtro não encontrados!');
        return;
    }
    
    // Filtro ao clicar no botão de pesquisa
    searchBtn.addEventListener('click', filtrarPorMatricula);
    
    // Filtro ao pressionar Enter no campo de pesquisa
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            filtrarPorMatricula();
        }
    });
}

function filtrarPorMatricula() {
    const searchInput = document.getElementById('search-nome');
    if (!searchInput) return;

    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        exibirColaboradores(colaboradores);
        return;
    }
    
    const colaboradoresFiltrados = colaboradores.filter(colaborador => 
        colaborador.matricula.includes(searchTerm)
    );
    
    exibirColaboradores(colaboradoresFiltrados);
}
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById("modalCadastro");
    const btnAbrir = document.getElementById("btnAdicionarUsuario");
    const btnFechar = document.querySelector(".close");
    const form = document.getElementById("colaboradorForm");

    // Abrir modal
    btnAbrir.addEventListener("click", () => {
        modal.style.display = "block";
    });

    // Fechar modal
    btnFechar.addEventListener("click", () => {
        modal.style.display = "none";
    });

    // Fechar ao clicar fora
    window.addEventListener("click", (event) => {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });

    // Enviar formulário
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const matricula = document.getElementById("matriculaColaborador").value;
        const nome = document.getElementById("nomeColaborador").value;
        const turno = document.getElementById("turnoColaborador").value;
        const setor = document.getElementById("setorColaborador").value;

        try {
            const response = await fetch(`${API_URL}/cadastrarColaborador`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ matricula, nome, turno, setor })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao cadastrar');
            }

            alert('Colaborador cadastrado com sucesso!');
            modal.style.display = "none";
            form.reset();
            
            // Atualiza a tabela
            await carregarColaboradores();
            
        } catch (error) {
            console.error('Erro:', error);
            alert(`Erro ao cadastrar: ${error.message}`);
        }
    });
});
function exibirColaboradores(dados) {
    const tbody = document.getElementById('dataTable1');
    tbody.innerHTML = dados.map(colaborador => {
        const emEdicao = modoEdicao === colaborador.matricula; // Usar matricula como ID
        const linhaClass = emEdicao ? 'edit-mode' : '';
        
        return `
        <tr data-id="${colaborador.matricula}" class="${linhaClass}"> <!-- Usar matricula como ID -->
            <td>${colaborador.matricula}</td>
            <td>
                ${emEdicao ? 
                    `<input type="text" value="${colaborador.nome}" class="edit-input">` : 
                    colaborador.nome}
            </td>
            <td>
                ${emEdicao ? `
                    <select class="edit-select">
                        <option value="1º Turno" ${colaborador.turno === '1º Turno' ? 'selected' : ''}>1º Turno</option>
                        <option value="2º Turno" ${colaborador.turno === '2º Turno' ? 'selected' : ''}>2º Turno</option>
                        <option value="3º Turno" ${colaborador.turno === '3º Turno' ? 'selected' : ''}>3º Turno</option>
                        <option value="4º Turno" ${colaborador.turno === '4º Turno' ? 'selected' : ''}>4º Turno</option>
                    </select>` : 
                    colaborador.turno}
            </td>
            <td>
                ${emEdicao ? `
                    <select class="edit-select">
                        <option value="Recebimento" ${colaborador.setor === 'Recebimento' ? 'selected' : ''}>Recebimento</option>
                        <option value="Armazenagem" ${colaborador.setor === 'Armazenagem' ? 'selected' : ''}>Armazenagem</option>
                        <option value="Separação" ${colaborador.setor === 'Separação' ? 'selected' : ''}>Separação</option>
                        <option value="Expedição" ${colaborador.setor === 'Expedição' ? 'selected' : ''}>Expedição</option>
                        <option value="Gerência" ${colaborador.setor === 'Gerência' ? 'selected' : ''}>Gerência</option>
                        <option value="Outro" ${colaborador.setor === 'Outro' ? 'selected' : ''}>Outro</option>
                    </select>` : 
                    colaborador.setor}
            </td>
            <td>
                ${emEdicao ? `
                    <button class="btn-acao btn-salvar" onclick="salvarEdicao('${colaborador.matricula}')">
                        <i class="fas fa-save"></i> Salvar
                    </button>
                    <button class="btn-acao btn-cancelar" onclick="cancelarEdicao()">
                        <i class="fas fa-times"></i> Cancelar
                    </button>` : 
                    `<button class="btn-acao btn-editar" onclick="iniciarEdicao('${colaborador.matricula}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-acao btn-excluir" onclick="confirmarExclusao('${colaborador.matricula}')">
                        <i class="fas fa-trash-alt"></i> Excluir
                    </button>`}
            </td>
        </tr>
        `;
    }).join('');
}

function iniciarEdicao(id) {
    modoEdicao = id;
    carregarColaboradores();
}

function cancelarEdicao() {
    modoEdicao = null;
    carregarColaboradores();
}

async function salvarEdicao(matricula) {
    let btnSalvar, originalText; // Declare ambas as variáveis no escopo da função
    
    try {
        const linha = document.querySelector(`tr[data-id="${matricula}"]`);
        const dadosAtualizados = {
            nome: linha.querySelector('.edit-input').value,
            turno: linha.querySelector('td:nth-child(3) .edit-select').value,
            setor: linha.querySelector('td:nth-child(4) .edit-select').value
        };

        btnSalvar = linha.querySelector('.btn-salvar');
        originalText = btnSalvar.innerHTML; // Atribua o valor aqui
        btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        btnSalvar.disabled = true;

        const response = await fetch(`${API_URL}/colaboradores/${matricula}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(dadosAtualizados)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao atualizar colaborador');
        }

        modoEdicao = null;
        await carregarColaboradores();
        alert('Colaborador atualizado com sucesso!');
    } catch (error) {
        console.error('Erro:', error);
        alert(`Erro ao salvar: ${error.message}`);
    } finally {
        if (btnSalvar && originalText) { // Verifique se ambas variáveis existem
            btnSalvar.innerHTML = originalText;
            btnSalvar.disabled = false;
        }
    }
}

async function confirmarExclusao(matricula) {
    if (!confirm('Tem certeza que deseja excluir este colaborador?')) return;
    
    let btnExcluir, originalText;
    
    try {
        btnExcluir = document.querySelector(`tr[data-id="${matricula}"] .btn-excluir`);
        originalText = btnExcluir.innerHTML;
        btnExcluir.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';
        btnExcluir.disabled = true;

        const response = await fetch(`${API_URL}/colaboradores/${matricula}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        const data = await response.json(); // Sempre parseie a resposta JSON

        if (!response.ok) {
            throw new Error(data.message || `Erro ${response.status} ao excluir`);
        }

        await carregarColaboradores();
        alert(data.message || 'Colaborador excluído com sucesso!');
    } catch (error) {
        console.error('Erro detalhado:', error);
        alert(`Falha ao excluir: ${error.message}`);
    } finally {
        if (btnExcluir && originalText) {
            btnExcluir.innerHTML = originalText;
            btnExcluir.disabled = false;
        }
    }
}
async function testarConexaoAPI() {
    try {
        const response = await fetch(`${API_URL}/colaboradores`);
        if (!response.ok) {
            throw new Error(`API retornou status ${response.status}`);
        }
        console.log('Conexão com API OK');
        return true;
    } catch (error) {
        console.error('Falha na conexão com API:', error);
        alert('Erro de conexão com o servidor. Verifique o console para detalhes.');
        return false;
    }
}

// Modifique o carregamento inicial
document.addEventListener('DOMContentLoaded', async () => {
    const conectado = await testarConexaoAPI();
    if (conectado) {
        await carregarColaboradores();
        configurarFiltroMatricula(); // Esta linha foi adicionada
    }
});
// Função para filtrar os dados
function filtrarDados() {
    const filtroNome = document.getElementById('filtroMatricula')?.value.toLowerCase() || '';
    const turno = document.getElementById('turno')?.value || '';
    const setor = document.getElementById('Setor')?.value || '';

    const dadosFiltrados = colaboradores.filter(colaborador => {
        return (
            (filtroNome === '' || colaborador.nome.toLowerCase().includes(filtroNome)) &&
            (turno === '' || colaborador.turno === turno) &&
            (setor === '' || colaborador.setor === setor)
        );
    });

    exibirColaboradores(dadosFiltrados);
}
function configurarFiltros() {
    // Filtro por matrícula
    const searchInput = document.getElementById('search-nome');
    const searchBtn = document.querySelector('.search-btn');
    
    if (searchInput && searchBtn) {
        searchBtn.addEventListener('click', filtrarPorMatricula);
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') filtrarPorMatricula();
        });
    }

    // Filtro avançado
    const filtroBtn = document.querySelector('#filtros button');
    if (filtroBtn) {
        filtroBtn.addEventListener('click', filtrarDados);
    }
}