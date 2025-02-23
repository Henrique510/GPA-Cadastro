const API_URL = 'https://gpa-cadastro.onrender.com/api'; // Adiciona a variável API_URL

const tabela1 = document.getElementById("dataTable1");
const tabela2 = document.getElementById("dataTable2");

// Função para encontrar o encarregado
function encontrarEncarregado(turno, setor) {
    const linhasTabela2 = tabela2.querySelectorAll("tr"); // Obtém todas as linhas da tabela 2

    for (let i = 0; i < linhasTabela2.length; i++) { // Itera sobre as linhas
        const linha = linhasTabela2[i];
        const turnoTabela2 = linha.cells[2].textContent;
        const setorTabela2 = linha.cells[3].textContent;

        if (turno === turnoTabela2 && setor === setorTabela2) {
            return linha.cells[1].textContent; // Retorna o nome do encarregado
        }
    }
    return ""; // Retorna vazio se não encontrar
}
async function atualizarContador() {
    try {
        const response = await fetch(`${API_URL}/colaboradores`);
        if (!response.ok) {
            throw new Error(`Erro ao obter dados: ${response.status}`);
        }
        const data = await response.json();
        document.getElementById('colaboradores-cadastrados').textContent = data.length;
    } catch (error) {
        console.error('Erro ao atualizar contador:', error);
    }
}

// Atualiza a tabela 1 automaticamente
function atualizarTabela1() {
    const linhasTabela1 = tabela1.querySelectorAll("tr");
    linhasTabela1.forEach(row => {
        const turno = row.cells[2].textContent;
        const setor = row.cells[3].textContent;
        const encarregado = encontrarEncarregado(turno, setor);
        row.cells[4].textContent = encarregado;
    });
}

async function carregarDados() {
    try {
        const response = await fetch(`${API_URL}/colaboradores`);
        if (!response.ok) {
            throw new Error(`Erro ao obter dados: ${response.status}`);
        }
        const data = await response.json();
        exibirDados(data);
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
}

function exibirDados(colaboradores) {
    const dataTable1 = document.getElementById('dataTable1');
    dataTable1.innerHTML = ''; // Limpa a tabela

    console.log('Dados recebidos para exibir:', colaboradores); // Adiciona esta linha

    colaboradores.forEach(colaborador => {
        const row = dataTable1.insertRow();
        const cell1 = row.insertCell(0);
        const cell2 = row.insertCell(1);
        const cell3 = row.insertCell(2);
        const cell4 = row.insertCell(3);

        cell1.textContent = colaborador.matricula;
        cell2.textContent = colaborador.nome;
        cell3.textContent = colaborador.turno;
        cell4.textContent = colaborador.setor;
    });
}

// Chama a função para atualizar a tabela 1 quando a página carrega
// REMOVIDO: atualizarTabela1();

// Chama a função para carregar os dados quando a página carrega
carregarDados();