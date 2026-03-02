// ALTERE AQUI: Use a URL do seu Railway em vez do Render
// const API_URL = 'https://gpa-cadastro.onrender.com/api'; // ANTIGA (Render)
const API_URL = 'https://gpa-cadastro-production.up.railway.app/api'; // NOVA (Railway)

let colaboradores = [];
let modoEdicao = null;

// Carrega os colaboradores ao iniciar
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Página carregada, verificando conexão...');
    const conectado = await testarConexaoAPI();
    if (conectado) {
        await carregarColaboradores();
        configurarFiltros(); // Configura todos os filtros de uma vez
        configurarModal(); // Configura o modal separadamente
    }
});

async function carregarColaboradores() {
    try {
        console.log('Carregando colaboradores...');
        const response = await fetch(`${API_URL}/colaboradores`);
        
        if (!response.ok) {
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        
        colaboradores = await response.json();
        console.log(`${colaboradores.length} colaboradores carregados`);
        exibirColaboradores(colaboradores);
    } catch (error) {
        console.error('Erro ao carregar colaboradores:', error);
        mostrarErro('Erro ao carregar colaboradores. Verifique o console.');
    }
}

function exibirColaboradores(dados) {
    const tbody = document.getElementById('dataTable1');
    if (!tbody) {
        console.error('Elemento dataTable1 não encontrado');
        return;
    }
    
    if (dados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum colaborador encontrado</td></tr>';
        return;
    }

    tbody.innerHTML = dados.map(colaborador => {
        const emEdicao = modoEdicao === colaborador.matricula;
        const linhaClass = emEdicao ? 'edit-mode' : '';
        
        return `
        <tr data-id="${colaborador.matricula}" class="${linhaClass}">
            <td>${colaborador.matricula}</td>
            <td>
                ${emEdicao ? 
                    `<input type="text" value="${escapeHtml(colaborador.nome)}" class="edit-input" data-field="nome">` : 
                    escapeHtml(colaborador.nome)}
            </td>
            <td>
                ${emEdicao ? `
                    <select class="edit-select" data-field="turno">
                        <option value="1º Turno" ${colaborador.turno === '1º Turno' ? 'selected' : ''}>1º Turno</option>
                        <option value="2º Turno" ${colaborador.turno === '2º Turno' ? 'selected' : ''}>2º Turno</option>
                        <option value="3º Turno" ${colaborador.turno === '3º Turno' ? 'selected' : ''}>3º Turno</option>
                        <option value="4º Turno" ${colaborador.turno === '4º Turno' ? 'selected' : ''}>4º Turno</option>
                    </select>` : 
                    escapeHtml(colaborador.turno)}
            </td>
            <td>
                ${emEdicao ? `
                    <select class="edit-select" data-field="setor">
                        <option value="Recebimento" ${colaborador.setor === 'Recebimento' ? 'selected' : ''}>Recebimento</option>
                        <option value="Armazenagem" ${colaborador.setor === 'Armazenagem' ? 'selected' : ''}>Armazenagem</option>
                        <option value="Separação" ${colaborador.setor === 'Separação' ? 'selected' : ''}>Separação</option>
                        <option value="Expedição" ${colaborador.setor === 'Expedição' ? 'selected' : ''}>Expedição</option>
                        <option value="Gerência" ${colaborador.setor === 'Gerência' ? 'selected' : ''}>Gerência</option>
                        <option value="Outro" ${colaborador.setor === 'Outro' ? 'selected' : ''}>Outro</option>
                    </select>` : 
                    escapeHtml(colaborador.setor)}
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
    
    // Aplica formatação de nomes após renderizar
    aplicarFormatacaoNomes();
}

// Função para escapar HTML e prevenir XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Função para aplicar formatação aos nomes
function aplicarFormatacaoNomes() {
    document.querySelectorAll('#dataTable1 td:nth-child(2)').forEach(cell => {
        if (!cell.querySelector('input')) { // Não formata se tiver input
            cell.textContent = formatarNome(cell.textContent);
        }
    });
}

function formatarNome(nome) {
    return nome.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

function configurarModal() {
    const modal = document.getElementById("modalCadastro");
    const btnAbrir = document.getElementById("btnAdicionarUsuario");
    const btnFechar = document.querySelector(".close");
    const form = document.getElementById("colaboradorForm");

    if (btnAbrir) {
        btnAbrir.addEventListener("click", () => {
            modal.style.display = "block";
        });
    }

    if (btnFechar) {
        btnFechar.addEventListener("click", () => {
            modal.style.display = "none";
        });
    }

    window.addEventListener("click", (event) => {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });

    if (form) {
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
                await carregarColaboradores();
                
            } catch (error) {
                console.error('Erro:', error);
                alert(`Erro ao cadastrar: ${error.message}`);
            }
        });
    }
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

    // Toggle filtros
    const filtrosToggle = document.getElementById('filtros-toggle');
    const filtrosSection = document.getElementById('filtros');
    if (filtrosToggle && filtrosSection) {
        filtrosToggle.addEventListener('click', () => {
            filtrosSection.classList.toggle('hidden');
        });
    }

    // Menu lateral
    const minimizarMenuButton = document.getElementById('minimizar-menu');
    const menuLateral = document.querySelector('.menu-lateral');
    const logoGPA = document.getElementById('logo-gpa');
    const menuTexts = document.querySelectorAll('.menu-text');

    if (minimizarMenuButton) {
        minimizarMenuButton.addEventListener('click', () => {
            menuLateral.classList.toggle('minimizado');
            if (logoGPA) {
                logoGPA.style.display = menuLateral.classList.contains('minimizado') ? 'none' : 'block';
            }
            menuTexts.forEach(text => {
                text.style.display = menuLateral.classList.contains('minimizado') ? 'none' : 'inline-block';
            });
        });
    }
}

function filtrarPorMatricula() {
    const searchInput = document.getElementById('search-nome');
    if (!searchInput) return;

    const searchTerm = searchInput.value.trim().toLowerCase();
    if (!searchTerm) {
        exibirColaboradores(colaboradores);
        return;
    }
    
    const colaboradoresFiltrados = colaboradores.filter(colaborador => 
        colaborador.matricula.includes(searchTerm) ||
        colaborador.nome.toLowerCase().includes(searchTerm)
    );
    
    exibirColaboradores(colaboradoresFiltrados);
}

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

function iniciarEdicao(id) {
    modoEdicao = id;
    exibirColaboradores(colaboradores);
}

function cancelarEdicao() {
    modoEdicao = null;
    exibirColaboradores(colaboradores);
}

async function salvarEdicao(matricula) {
    let btnSalvar, originalText;
    
    try {
        const linha = document.querySelector(`tr[data-id="${matricula}"]`);
        if (!linha) throw new Error('Linha não encontrada');
        
        // Coleta os dados dos inputs
        const dadosAtualizados = {
            nome: linha.querySelector('input[data-field="nome"]').value,
            turno: linha.querySelector('select[data-field="turno"]').value,
            setor: linha.querySelector('select[data-field="setor"]').value
        };

        btnSalvar = linha.querySelector('.btn-salvar');
        originalText = btnSalvar.innerHTML;
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

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `Erro ${response.status} ao atualizar`);
        }

        modoEdicao = null;
        await carregarColaboradores();
        alert('Colaborador atualizado com sucesso!');
    } catch (error) {
        console.error('Erro:', error);
        alert(`Erro ao salvar: ${error.message}`);
    } finally {
        if (btnSalvar && originalText) {
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

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `Erro ${response.status} ao excluir`);
        }

        await carregarColaboradores();
        alert('Colaborador excluído com sucesso!');
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
        console.log('Testando conexão com API...');
        const response = await fetch(`${API_URL}/colaboradores`);
        
        if (!response.ok) {
            throw new Error(`API retornou status ${response.status}`);
        }
        
        console.log('✅ Conexão com API OK');
        return true;
    } catch (error) {
        console.error('❌ Falha na conexão com API:', error);
        mostrarErro('Erro de conexão com o servidor. Verifique se o backend está rodando.');
        return false;
    }
}

function mostrarErro(mensagem) {
    const tbody = document.getElementById('dataTable1');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">${mensagem}</td></tr>`;
    }
    alert(mensagem);
}

// Exportar para Excel
document.addEventListener('DOMContentLoaded', () => {
    const exportBtn = document.getElementById('exportar-excel');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToExcel);
    }
});

function exportToExcel() {
    if (colaboradores.length === 0) {
        alert('Não há dados para exportar');
        return;
    }

    // Formata os dados para exportação
    const dadosFormatados = colaboradores.map(col => ({
        Matrícula: col.matricula,
        Nome: formatarNome(col.nome),
        Turno: col.turno,
        Setor: col.setor
    }));

    // Cria planilha
    const ws = XLSX.utils.json_to_sheet(dadosFormatados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Colaboradores");
    
    // Ajusta largura das colunas
    const colWidths = [
        { wch: 15 }, // Matrícula
        { wch: 40 }, // Nome
        { wch: 15 }, // Turno
        { wch: 20 }  // Setor
    ];
    ws['!cols'] = colWidths;

    // Exporta
    XLSX.writeFile(wb, `Colaboradores_${new Date().toLocaleDateString()}.xlsx`);
}
