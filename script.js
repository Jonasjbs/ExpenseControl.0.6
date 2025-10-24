// js/script.js (expenseControl 0.3)

let dadosMotorista = [];
const LOCAL_STORAGE_KEY = 'controleGastosMotorista';
let graficoInstance = null;

// Variáveis para rastrear o período de filtro atual (Início com o mês/ano atual)
let mesFiltroAtual = new Date().getMonth() + 1;
let anoFiltroAtual = new Date().getFullYear();

// Variáveis de Geolocalização
let coordenadaInicial = null; 

// Referências DOM
const dashboardResumo = document.getElementById('dashboard-resumo');
const tabelaRegistrosBody = document.querySelector('#tabelaRegistros tbody');
const formReceita = document.getElementById('formReceita');
const formDespesa = document.getElementById('formDespesa');
const aplicarFiltroButton = document.getElementById('aplicarFiltro');

// Controles de KM
const btnIniciarCorrida = document.getElementById('btnIniciarCorrida');
const btnEncerrarCorrida = document.getElementById('btnEncerrarCorrida');
const kmPercorridoInput = document.getElementById('kmPercorrido');
const coordInicioInput = document.getElementById('coordInicio');
const coordFimInput = document.getElementById('coordFim');
const idaEVoltaCheckbox = document.getElementById('idaEVolta');

// Seletores de Filtro
const filtroMesSelect = document.getElementById('filtroMes');
const filtroAnoSelect = document.getElementById('filtroAno');


// ----------------------------------------------------
// MÓDULO: Geolocalização e Haversine
// ----------------------------------------------------

function obterLocalizacao(callback) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                callback({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            (error) => {
                alert(`Erro de Geolocalização. Verifique se a permissão de localização está ativada: ${error.message}`);
                console.error("Erro na geolocalização:", error);
                callback(null);
            }, 
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    } else {
        alert("Geolocalização não é suportada por este navegador/dispositivo.");
        callback(null);
    }
}

/**
 * Fórmula de Haversine: Calcula a distância em KM entre dois pontos (Linha Reta)
 */
function calcularDistanciaHaversine(coord1, coord2) {
    if (!coord1 || !coord2) return 0;

    const lat1 = coord1.lat;
    const lon1 = coord1.lng;
    const lat2 = coord2.lat;
    const lon2 = coord2.lng;

    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c; // Distância em KM
}

// Evento: Iniciar Corrida
btnIniciarCorrida.addEventListener('click', () => {
    btnIniciarCorrida.disabled = true;
    btnEncerrarCorrida.disabled = true;
    kmPercorridoInput.value = "Capturando...";
    
    obterLocalizacao((coord) => {
        if (coord) {
            coordenadaInicial = coord;
            coordInicioInput.value = `${coord.lat},${coord.lng}`;
            kmPercorridoInput.value = "Ponto A Capturado. Siga a rota.";
            btnEncerrarCorrida.disabled = false;
        } else {
            btnIniciarCorrida.disabled = false;
            kmPercorridoInput.value = "Erro na Captura";
        }
    });
});

// Evento: Encerrar Corrida
btnEncerrarCorrida.addEventListener('click', () => {
    btnEncerrarCorrida.disabled = true;
    kmPercorridoInput.value = "Calculando KM...";

    obterLocalizacao((coordFim) => {
        if (coordFim && coordenadaInicial) {
            
            const distancia = calcularDistanciaHaversine(coordenadaInicial, coordFim);
            let kmFinal = distancia;

            if (idaEVoltaCheckbox.checked) {
                kmFinal *= 2; // Dobra o KM se for Ida e Volta
            }

            kmPercorridoInput.value = kmFinal.toFixed(2) + " Km";
            coordFimInput.value = `${coordFim.lat},${coordFim.lng}`;

        } else {
            kmPercorridoInput.value = "Erro no Cálculo/Captura";
        }
        btnIniciarCorrida.disabled = false;
    });
});


// ----------------------------------------------------
// MÓDULO: Persistência e Inicialização
// ----------------------------------------------------

function salvarDados() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dadosMotorista));
    popularFiltros();
}

function carregarDados() {
    const hoje = new Date();
    const hojeFormatado = hoje.toISOString().substring(0, 10);
    document.getElementById('dataReceita').value = hojeFormatado;
    document.getElementById('dataDespesa').value = hojeFormatado;
    
    const dadosSalvos = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (dadosSalvos) {
        dadosMotorista = JSON.parse(dadosSalvos);
    }
    
    popularFiltros();
    aplicarFiltro();
}

function popularFiltros() {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    
    // 1. Popular Anos
    let anos = new Set();
    dadosMotorista.forEach(reg => anos.add(new Date(reg.data).getFullYear()));
    if (!anos.has(anoAtual)) anos.add(anoAtual);
    
    filtroAnoSelect.innerHTML = '';
    [...anos].sort((a, b) => b - a).forEach(ano => {
        const option = document.createElement('option');
        option.value = ano;
        option.textContent = ano;
        filtroAnoSelect.appendChild(option);
    });

    // 2. Popular Meses
    const nomesMeses = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    filtroMesSelect.innerHTML = '';
    nomesMeses.forEach((nome, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = nome;
        filtroMesSelect.appendChild(option);
    });
    
    filtroMesSelect.value = mesFiltroAtual;
    filtroAnoSelect.value = anoFiltroAtual;
}

function aplicarFiltro() {
    mesFiltroAtual = parseInt(filtroMesSelect.value);
    anoFiltroAtual = parseInt(filtroAnoSelect.value);
    
    calcularEExibirTotais();
    renderizarGraficoDespesas();
    renderizarTabela();
}


// ----------------------------------------------------
// MÓDULO: Cálculos e Dashboard (Controle Geral)
// ----------------------------------------------------

function filtrarDadosPorPeriodo() {
    return dadosMotorista.filter(reg => {
        const dataReg = new Date(reg.data + 'T00:00:00'); 
        if (isNaN(dataReg)) return false; 
        
        const regMes = dataReg.getMonth() + 1;
        const regAno = dataReg.getFullYear();
        
        return regMes === mesFiltroAtual && regAno === anoFiltroAtual;
    });
}

function calcularTotais() {
    const dadosFiltrados = filtrarDadosPorPeriodo();

    const resultados = dadosFiltrados.reduce((acc, reg) => {
        if (reg.tipo === 'receita') {
            acc.receita += reg.valor;
            acc.totalKm += (reg.kmPercorrido || 0); 
        } else if (reg.tipo === 'despesa') {
            acc.despesa += reg.valor;
        }
        return acc;
    }, { receita: 0, despesa: 0, totalKm: 0 }); 

    resultados.saldo = resultados.receita - resultados.despesa;
    return resultados;
}

function calcularEExibirTotais() {
    const totaisPeriodo = calcularTotais();
    const nomeMes = filtroMesSelect.options[filtroMesSelect.selectedIndex].text;
    
    dashboardResumo.innerHTML = `
        <div class="col-lg-3 col-md-6 mb-3">
            <div class="card p-3 shadow-sm border-success bg-light">
                <h5 class="text-success"><i class="fas fa-money-check-alt"></i> Receita (${nomeMes})</h5>
                <p class="fs-4 text-success fw-bold">R$ ${totaisPeriodo.receita.toFixed(2).replace('.', ',')}</p>
            </div>
        </div>
        <div class="col-lg-3 col-md-6 mb-3">
            <div class="card p-3 shadow-sm border-danger bg-light">
                <h5 class="text-danger"><i class="fas fa-wallet"></i> Despesa (${nomeMes})</h5>
                <p class="fs-4 text-danger fw-bold">R$ ${totaisPeriodo.despesa.toFixed(2).replace('.', ',')}</p>
            </div>
        </div>
        <div class="col-lg-3 col-md-6 mb-3">
            <div class="card p-3 shadow-sm border-primary bg-light">
                <h5 class="text-primary"><i class="fas fa-chart-bar"></i> Saldo (${nomeMes})</h5>
                <p class="fs-4 fw-bold" style="color: ${totaisPeriodo.saldo >= 0 ? '#28a745' : '#dc3545'};">R$ ${totaisPeriodo.saldo.toFixed(2).replace('.', ',')}</p>
            </div>
        </div>
        <div class="col-lg-3 col-md-6 mb-3">
            <div class="card p-3 shadow-sm border-info bg-light">
                <h5 class="text-info"><i class="fas fa-tachometer-alt"></i> KM Total Rodado</h5>
                <p class="fs-4 text-info fw-bold">${totaisPeriodo.totalKm.toFixed(2).replace('.', ',')} Km</p>
            </div>
        </div>
    `;
}

function renderizarTabela() {
    tabelaRegistrosBody.innerHTML = '';
    
    const dadosParaExibir = filtrarDadosPorPeriodo(); 
    const dadosOrdenados = [...dadosParaExibir].sort((a, b) => new Date(b.data) - new Date(a.data));

    if (dadosOrdenados.length === 0) {
        tabelaRegistrosBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Nenhum registro encontrado para o período selecionado.</td></tr>`;
        return;
    }

    dadosOrdenados.forEach(reg => {
        const tr = document.createElement('tr');
        const classeCor = reg.tipo === 'receita' ? 'text-success' : 'text-danger';

        let descricaoDetalhada;
        if (reg.tipo === 'receita') {
            const kmInfo = reg.kmPercorrido ? ` (${reg.kmPercorrido.toFixed(2).replace('.', ',')} Km)` : '';
            descricaoDetalhada = `<i class="fas fa-user"></i> ${reg.cliente} - <i class="fas fa-map-marker-alt"></i> ${reg.destino}${kmInfo}`;
        } else {
            descricaoDetalhada = `<i class="fas fa-tag"></i> ${reg.categoria}: ${reg.descricao}`;
        }

        tr.innerHTML = `
            <td><i class="fas ${reg.tipo === 'receita' ? 'fa-arrow-up' : 'fa-arrow-down'} ${classeCor}"></i></td>
            <td>${descricaoDetalhada}</td>
            <td class="text-end fw-bold ${classeCor}">R$ ${reg.valor.toFixed(2).replace('.', ',')}</td>
            <td>${new Date(reg.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="excluirRegistro(${reg.id})">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        
        // Parte clicável para detalhes
        tr.onclick = () => alert(`DETALHES DO REGISTRO:\n
Tipo: ${reg.tipo.toUpperCase()}
Valor: R$ ${reg.valor.toFixed(2).replace('.', ',')}
${reg.tipo === 'receita' ? 'KM Percorrido: ' + (reg.kmPercorrido ? reg.kmPercorrido.toFixed(2) + ' Km' : 'N/A') : ''}
Data: ${new Date(reg.data + 'T00:00:00').toLocaleDateString('pt-BR')}
...`);

        tabelaRegistrosBody.appendChild(tr);
    });
}

function excluirRegistro(id) {
    if (confirm("Tem certeza que deseja excluir este registro?")) {
        dadosMotorista = dadosMotorista.filter(reg => reg.id !== id);
        salvarDados();
        aplicarFiltro();
    }
}

function renderizarGraficoDespesas() {
    const dadosFiltrados = filtrarDadosPorPeriodo().filter(reg => reg.tipo === 'despesa');
    
    const despesasPorCategoria = dadosFiltrados
        .reduce((acc, reg) => {
            acc[reg.categoria] = (acc[reg.categoria] || 0) + reg.valor;
            return acc;
        }, {});

    const labels = Object.keys(despesasPorCategoria);
    const data = Object.values(despesasPorCategoria);

    if (graficoInstance) {
        graficoInstance.destroy();
    }

    const ctx = document.getElementById('graficoDespesas').getContext('2d');
    
    const cores = {
        'Gasolina': '#ffcd56',
        'Pedágio': '#4bc0c0',
        'Manutenção': '#ff6384',
        'Refeição': '#36a2eb',
        'Outros': '#9966ff'
    };

    const coresFinais = labels.map(label => cores[label] || '#cccccc');

    graficoInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: coresFinais,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                },
                title: {
                    display: true,
                    text: `Despesas do Mês de ${filtroMesSelect.options[filtroMesSelect.selectedIndex].text}`
                }
            }
        }
    });
}


// ----------------------------------------------------
// MÓDULO: Event Listeners
// ----------------------------------------------------

formReceita.addEventListener('submit', function(e) {
    e.preventDefault();
    
    let kmValue = kmPercorridoInput.value.replace(' Km', '').replace(',', '.');
    kmValue = parseFloat(kmValue) || 0;

    const novoRegistro = {
        id: Date.now(), 
        tipo: 'receita',
        cliente: document.getElementById('nomeCliente').value,
        destino: document.getElementById('destino').value,
        data: document.getElementById('dataReceita').value,
        valor: parseFloat(document.getElementById('valorReceita').value),
        
        kmPercorrido: kmValue,
        coordInicio: coordInicioInput.value,
        coordFim: coordFimInput.value
    };

    dadosMotorista.push(novoRegistro);
    salvarDados();
    
    // Filtra para o mês do novo registro
    const dataNova = new Date(novoRegistro.data);
    filtroMesSelect.value = dataNova.getMonth() + 1;
    filtroAnoSelect.value = dataNova.getFullYear();
    aplicarFiltro(); 
    
    // Limpa formulário e rastreador de KM
    this.reset();
    kmPercorridoInput.value = "0.00 Km";
    coordenadaInicial = null;
    btnIniciarCorrida.disabled = false;
    btnEncerrarCorrida.disabled = true;
});

formDespesa.addEventListener('submit', function(e) {
    e.preventDefault();

    const novoRegistro = {
        id: Date.now(),
        tipo: 'despesa',
        categoria: document.getElementById('tipoGasto').value,
        descricao: document.getElementById('descricaoGasto').value,
        data: document.getElementById('dataDespesa').value,
        valor: parseFloat(document.getElementById('valorDespesa').value)
    };

    dadosMotorista.push(novoRegistro);
    salvarDados();
    
    // Filtra para o mês do novo registro
    const dataNova = new Date(novoRegistro.data);
    filtroMesSelect.value = dataNova.getMonth() + 1;
    filtroAnoSelect.value = dataNova.getFullYear();
    aplicarFiltro();
    this.reset();
});

// Listener para o botão 'Aplicar Filtro'
aplicarFiltroButton.addEventListener('click', aplicarFiltro);

// Inicialização da Aplicação
document.addEventListener('DOMContentLoaded', carregarDados);