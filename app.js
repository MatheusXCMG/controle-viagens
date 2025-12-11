// app.js - Sistema de Controle de Viagens com Motoristas Pré-selecionados

// ==================== VARIÁVEIS GLOBAIS ====================
let viagens = [];
let filtroAtual = '';
let contadorPassageiros = 1;

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚗 Sistema de Controle de Viagens iniciado');
    
    // Configurar data padrão para hoje
    const hoje = new Date();
    document.getElementById('data').valueAsDate = hoje;
    
    // Configurar horário padrão (próxima hora redonda)
    const proximaHora = new Date(hoje.getTime() + 60 * 60 * 1000);
    document.getElementById('horario').value = 
        proximaHora.getHours().toString().padStart(2, '0') + ':00';
    
    // Carregar viagens ao iniciar
    carregarViagens();
    
    // Configurar busca em tempo real
    document.getElementById('busca').addEventListener('input', function() {
        filtroAtual = this.value.toLowerCase();
        filtrarViagens();
    });
    
    // Configurar teclas de atalho
    configurarTeclas();
    
    console.log('✅ Sistema inicializado com sucesso!');
});

// ==================== FUNÇÕES PARA MOTORISTAS ====================

function atualizarCampos() {
    const motorista = document.getElementById('motorista').value;
    const camposVan = document.getElementById('campos-van');
    const campoPassageiroUber = document.getElementById('campo-passageiro-uber');
    
    // Mostrar/ocultar campos da Van
    if (motorista === 'Van') {
        camposVan.style.display = 'block';
        campoPassageiroUber.style.display = 'none';
        
        // Garantir que tem pelo menos um passageiro
        if (contadorPassageiros === 0) {
            adicionarPassageiro();
        }
    } else if (motorista === 'Uber') {
        camposVan.style.display = 'none';
        campoPassageiroUber.style.display = 'block';
    } else {
        // Handerson ou Beto
        camposVan.style.display = 'none';
        campoPassageiroUber.style.display = 'none';
    }
}

// ==================== PASSAGEIROS DINÂMICOS ====================

function adicionarPassageiro() {
    contadorPassageiros++;
    const lista = document.getElementById('lista-passageiros');
    
    const novoPassageiro = document.createElement('div');
    novoPassageiro.className = 'passageiro-item';
    novoPassageiro.innerHTML = `
        <div class="form-grid">
            <div class="form-group">
                <label class="required">Nome do Passageiro *</label>
                <input type="text" class="form-control passageiro-nome" placeholder="Nome completo" required>
            </div>
            <div class="form-group">
                <label class="required">Documento *</label>
                <input type="text" class="form-control passageiro-documento" placeholder="CPF ou RG" required>
            </div>
            <div class="form-group" style="align-self: flex-end;">
                <button type="button" class="btn btn-small btn-danger" onclick="removerPassageiro(this)" style="margin-top: 24px;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    
    lista.appendChild(novoPassageiro);
}

function removerPassageiro(botao) {
    const passageiroItem = botao.closest('.passageiro-item');
    if (passageiroItem) {
        passageiroItem.remove();
        contadorPassageiros--;
        
        // Se não houver mais passageiros, adiciona um padrão
        if (contadorPassageiros === 0) {
            adicionarPassageiro();
        }
    }
}

function obterPassageirosVan() {
    const passageiros = [];
    const itens = document.querySelectorAll('.passageiro-item');
    
    itens.forEach((item, index) => {
        const nome = item.querySelector('.passageiro-nome').value.trim();
        const documento = item.querySelector('.passageiro-documento').value.trim();
        
        if (nome || documento) {
            passageiros.push({
                nome: nome || `Passageiro ${index + 1}`,
                documento: documento || 'N/A'
            });
        }
    });
    
    return passageiros;
}

// ==================== FUNÇÕES PRINCIPAIS ====================

// CARREGAR VIAGENS
async function carregarViagens() {
    mostrarLoading('Carregando viagens...');
    
    try {
        console.log('🔄 Iniciando carregamento de viagens...');
        viagens = await window.supabase.buscarViagens();
        console.log(`📊 ${viagens ? viagens.length : 0} viagens carregadas`);
        
        // Garantir que viagens é um array
        if (!Array.isArray(viagens)) {
            console.warn('⚠️ viagens não é um array, convertendo...');
            viagens = [];
        }
        
        // Atualizar interface
        atualizarTabela();
        atualizarContador();
        
    } catch (error) {
        console.error('❌ Erro ao carregar viagens:', error);
        mostrarMensagem('Erro ao carregar viagens: ' + error.message, 'erro');
        viagens = []; // Reset para array vazio em caso de erro
    } finally {
        // Esconder linha de loading
        const loadingRow = document.getElementById('loading-row');
        if (loadingRow) loadingRow.style.display = 'none';
        
        esconderLoading();
    }
}

// RECARREGAR VIAGENS (forçar atualização)
async function recarregarViagens() {
    console.log('🔄 Forçando recarregamento...');
    mostrarLoading('Atualizando...');
    
    try {
        viagens = await window.supabase.buscarViagens(true);
        atualizarTabela();
        atualizarContador();
        mostrarMensagem('Viagens atualizadas!', 'sucesso');
    } catch (error) {
        console.error('❌ Erro ao recarregar:', error);
        mostrarMensagem('Erro ao atualizar', 'erro');
    } finally {
        esconderLoading();
    }
}

// SALVAR VIAGEM
async function salvarViagem() {
    // Validar formulário
    if (!validarFormulario()) {
        mostrarMensagem('Preencha todos os campos obrigatórios (*)', 'erro');
        return;
    }
    
    // Coletar dados do formulário
    const dados = coletarDadosFormulario();
    
    mostrarLoading('Salvando viagem...');
    
    try {
        // Salvar no Supabase
        const resultado = await window.supabase.salvarViagem(dados);
        
        if (resultado.success) {
            // Mostrar mensagem de sucesso
            mostrarMensagemModal(resultado.message);
            
            // Se salvou online, atualizar lista
            if (resultado.mode === 'online') {
                await carregarViagens();
            } else {
                // Se offline, adicionar localmente na tabela
                const novaViagem = {
                    id: resultado.data.id,
                    ...dados,
                    origemDados: 'offline',
                    status: 'pendente',
                    criadoEm: new Date().toISOString()
                };
                viagens.unshift(novaViagem);
                atualizarTabela();
                atualizarContador();
            }
            
            // Limpar formulário
            limparFormulario();
            
        } else {
            mostrarMensagem(resultado.message, 'erro');
        }
        
    } catch (error) {
        console.error('❌ Erro ao salvar:', error);
        mostrarMensagem('Erro ao salvar viagem', 'erro');
    } finally {
        esconderLoading();
    }
}

// GERAR WHATSAPP
function gerarWhatsApp() {
    if (!validarFormulario()) {
        mostrarMensagem('Preencha todos os campos obrigatórios (*)', 'erro');
        return;
    }
    
    const dados = coletarDadosFormulario();
    const link = window.supabase.gerarLinkWhatsApp(dados);
    
    // Abrir WhatsApp em nova aba
    window.open(link, '_blank');
    
    // Feedback visual
    mostrarMensagem('WhatsApp aberto em nova janela', 'sucesso');
}

// ==================== FUNÇÕES DE FORMULÁRIO ====================

function coletarDadosFormulario() {
    const motorista = document.getElementById('motorista').value;
    
    // Para Van, processar passageiros dinâmicos
    let passageiroTexto = '';
    if (motorista === 'Van') {
        const passageiros = obterPassageirosVan();
        passageiroTexto = passageiros.map(p => `${p.nome} - ${p.documento}`).join(' | ');
    } else if (motorista === 'Uber') {
        passageiroTexto = document.getElementById('passageiro-uber').value.trim();
    } else {
        // Handerson e Beto - sem campo de passageiro
        passageiroTexto = '';
    }
    
    return {
        data: document.getElementById('data').value,
        horario: document.getElementById('horario').value,
        motorista: motorista,
        origem: document.getElementById('origem').value.trim(),
        destino: document.getElementById('destino').value.trim(),
        passageiro: passageiroTexto,
        observacoes: document.getElementById('observacoes').value.trim()
    };
}

function validarFormulario() {
    const camposObrigatorios = ['data', 'horario', 'motorista', 'origem', 'destino'];
    let valido = true;
    
    // Validar campos básicos
    camposObrigatorios.forEach(campo => {
        const elemento = document.getElementById(campo);
        if (!elemento.value.trim()) {
            elemento.style.borderColor = '#FF5252';
            valido = false;
        } else {
            elemento.style.borderColor = '#e0e0e0';
        }
    });
    
    // Validação especial para Van
    const motorista = document.getElementById('motorista').value;
    if (motorista === 'Van') {
        const passageiros = obterPassageirosVan();
        
        if (passageiros.length === 0) {
            mostrarMensagem('Adicione pelo menos um passageiro para Van', 'erro');
            valido = false;
        }
        
        // Validar cada passageiro
        const itens = document.querySelectorAll('.passageiro-item');
        itens.forEach((item) => {
            const nome = item.querySelector('.passageiro-nome').value.trim();
            const documento = item.querySelector('.passageiro-documento').value.trim();
            const inputs = item.querySelectorAll('input');
            
            if (!nome || !documento) {
                inputs.forEach(input => {
                    if (!input.value.trim()) {
                        input.style.borderColor = '#FF5252';
                    }
                });
                valido = false;
            } else {
                inputs.forEach(input => {
                    input.style.borderColor = '#e0e0e0';
                });
            }
        });
    }
    
    return valido;
}

function limparFormulario() {
    // Limpar campos básicos
    document.getElementById('motorista').value = '';
    document.getElementById('origem').value = '';
    document.getElementById('destino').value = '';
    document.getElementById('passageiro-uber').value = '';
    document.getElementById('observacoes').value = '';
    
    // Limpar passageiros da Van
    const listaPassageiros = document.getElementById('lista-passageiros');
    listaPassageiros.innerHTML = `
        <div class="passageiro-item">
            <div class="form-grid">
                <div class="form-group">
                    <label class="required">Nome do Passageiro *</label>
                    <input type="text" class="form-control passageiro-nome" placeholder="Nome completo" required>
                </div>
                <div class="form-group">
                    <label class="required">Documento *</label>
                    <input type="text" class="form-control passageiro-documento" placeholder="CPF ou RG" required>
                </div>
                <div class="form-group" style="align-self: flex-end;">
                    <button type="button" class="btn btn-small btn-danger" onclick="removerPassageiro(this)" style="margin-top: 24px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    contadorPassageiros = 1;
    document.getElementById('campos-van').style.display = 'none';
    document.getElementById('campo-passageiro-uber').style.display = 'none';
    
    // Resetar validação visual
    ['motorista', 'origem', 'destino'].forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.style.borderColor = '#e0e0e0';
    });
    
    // Focar no primeiro campo
    document.getElementById('motorista').focus();
}

// ==================== FUNÇÕES DA TABELA ====================

function atualizarTabela() {
    const tbody = document.getElementById('corpo-tabela');
    
    if (!tbody) {
        console.error('❌ Tabela não encontrada');
        return;
    }
    
    // Limpar tabela
    tbody.innerHTML = '';
    
    // Aplicar filtro se existir
    let viagensParaExibir = viagens;
    if (filtroAtual) {
        viagensParaExibir = viagens.filter(v =>
            (v.motorista && v.motorista.toLowerCase().includes(filtroAtual)) ||
            (v.origem && v.origem.toLowerCase().includes(filtroAtual)) ||
            (v.destino && v.destino.toLowerCase().includes(filtroAtual))
        );
    }
    
    // Ordenar por data mais recente primeiro
    viagensParaExibir.sort((a, b) => {
        const dataA = new Date(a.data + 'T' + a.horario);
        const dataB = new Date(b.data + 'T' + b.horario);
        return dataB - dataA;
    });
    
    // Adicionar cada viagem
    viagensParaExibir.forEach(viagem => {
        const row = document.createElement('tr');
        
        // Formatar data (se existir)
        const dataFormatada = viagem.data ? 
            new Date(viagem.data).toLocaleDateString('pt-BR') : '';
        
        // Determinar classe CSS baseada no motorista
        let motoristaClass = '';
        switch(viagem.motorista) {
            case 'Van':
                motoristaClass = 'motorista-van';
                break;
            case 'Uber':
                motoristaClass = 'motorista-uber';
                break;
            case 'Handerson':
                motoristaClass = 'motorista-handerson';
                break;
            case 'Beto':
                motoristaClass = 'motorista-beto';
                break;
        }
        
        // Formatar rota
        const rota = `${viagem.origem || ''} → ${viagem.destino || ''}`;
        
        // Escapar aspas no link do WhatsApp para evitar erros no onclick
        const whatsappLink = viagem.whatsappLink ? viagem.whatsappLink.replace(/'/g, "\\'") : '';
        
        row.innerHTML = `
            <td>${dataFormatada}</td>
            <td>${viagem.horario || ''}</td>
            <td class="${motoristaClass}"><strong>${viagem.motorista || ''}</strong></td>
            <td>${rota}</td>
            <td class="actions-cell">
                ${whatsappLink ? `
                <button class="action-btn action-whatsapp" onclick="abrirWhatsAppExistente('${whatsappLink}')">
                    <i class="fab fa-whatsapp"></i>
                </button>
                ` : ''}
                <button class="action-btn action-edit" onclick="editarViagem('${viagem.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn action-delete" onclick="excluirViagem('${viagem.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        // Destacar viagens offline
        if (viagem.origemDados === 'offline') {
            row.style.opacity = '0.8';
            row.style.fontStyle = 'italic';
        }
        
        tbody.appendChild(row);
    });
    
    // Se não houver viagens
    if (viagensParaExibir.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    ${filtroAtual ? 
                        'Nenhuma viagem encontrada com este filtro' : 
                        'Nenhuma viagem cadastrada'}
                </td>
            </tr>
        `;
    }
}

function filtrarViagens() {
    atualizarTabela();
    atualizarContador();
}

function atualizarContador() {
    const totalElement = document.getElementById('total-viagens');
    const fonteElement = document.getElementById('fonte-dados');
    
    if (!totalElement || !fonteElement) return;
    
    const total = filtroAtual ? 
        viagens.filter(v =>
            (v.motorista && v.motorista.toLowerCase().includes(filtroAtual)) ||
            (v.origem && v.origem.toLowerCase().includes(filtroAtual)) ||
            (v.destino && v.destino.toLowerCase().includes(filtroAtual))
        ).length : 
        viagens.length;
    
    totalElement.textContent = `${total} viagem${total !== 1 ? 's' : ''}`;
    
    // Determinar fonte dos dados
    const temOnline = viagens.some(v => v.origemDados === 'supabase');
    const temOffline = viagens.some(v => v.origemDados === 'offline');
    
    if (temOnline && temOffline) {
        fonteElement.textContent = 'Misto';
        fonteElement.className = 'badge';
    } else if (temOnline) {
        fonteElement.textContent = 'Supabase';
        fonteElement.className = 'badge lists';
    } else if (temOffline) {
        fonteElement.textContent = 'Local';
        fonteElement.className = 'badge local';
    } else {
        fonteElement.textContent = 'Vazio';
        fonteElement.className = 'badge';
    }
}

// ==================== FUNÇÕES DE AÇÃO ====================

function abrirWhatsAppExistente(link) {
    if (link && link.startsWith('https://')) {
        window.open(link, '_blank');
    }
}

function editarViagem(id) {
    const viagem = viagens.find(v => v.id === id);
    if (!viagem) {
        mostrarMensagem('Viagem não encontrada', 'erro');
        return;
    }
    
    // Preencher formulário
    document.getElementById('data').value = viagem.data || '';
    document.getElementById('horario').value = viagem.horario || '';
    document.getElementById('motorista').value = viagem.motorista || '';
    document.getElementById('origem').value = viagem.origem || '';
    document.getElementById('destino').value = viagem.destino || '';
    document.getElementById('observacoes').value = viagem.observacoes || '';
    
    // Se for van, preencher passageiros
    if (viagem.motorista === 'Van' && viagem.passageiro) {
        // Limpar lista atual
        const listaPassageiros = document.getElementById('lista-passageiros');
        listaPassageiros.innerHTML = '';
        
        // Dividir passageiros pelo separador " | "
        const passageirosArray = viagem.passageiro.split(' | ');
        contadorPassageiros = 0;
        
        passageirosArray.forEach(passageiroStr => {
            const [nome, documento] = passageiroStr.split(' - ');
            if (nome || documento) {
                adicionarPassageiro();
                const ultimoItem = listaPassageiros.lastElementChild;
                ultimoItem.querySelector('.passageiro-nome').value = nome || '';
                ultimoItem.querySelector('.passageiro-documento').value = documento || '';
            }
        });
    }
    
    // Se for Uber, preencher passageiro
    if (viagem.motorista === 'Uber') {
        document.getElementById('passageiro-uber').value = viagem.passageiro || '';
    }
    
    // Atualizar campos baseados no motorista
    atualizarCampos();
    
    // Remover da lista temporariamente (para evitar duplicação)
    viagens = viagens.filter(v => v.id !== id);
    atualizarTabela();
    atualizarContador();
    
    mostrarMensagem('Viagem carregada para edição', 'sucesso');
    document.getElementById('motorista').focus();
}

function excluirViagem(id) {
    if (!confirm('Tem certeza que deseja excluir esta viagem?')) return;
    
    // Se for viagem offline, remover do localStorage
    const viagem = viagens.find(v => v.id === id);
    if (viagem && viagem.origemDados === 'offline') {
        const dadosOffline = JSON.parse(localStorage.getItem('viagens_offline_xcmg') || '[]');
        const novosDados = dadosOffline.filter(v => v.id !== id);
        localStorage.setItem('viagens_offline_xcmg', JSON.stringify(novosDados));
    }
    
    // Remover da lista
    viagens = viagens.filter(v => v.id !== id);
    atualizarTabela();
    atualizarContador();
    
    mostrarMensagem('Viagem excluída', 'sucesso');
}

// ==================== FUNÇÕES UTILITÁRIAS ====================

function mostrarMensagem(texto, tipo = 'info') {
    // Criar ou reusar elemento de mensagem
    let mensagemDiv = document.getElementById('mensagem-flutuante');
    
    if (!mensagemDiv) {
        mensagemDiv = document.createElement('div');
        mensagemDiv.id = 'mensagem-flutuante';
        document.body.appendChild(mensagemDiv);
    }
    
    // Configurar cor baseada no tipo
    const cores = {
        sucesso: '#4CAF50',
        erro: '#FF5252',
        aviso: '#FF9800',
        info: '#2196F3'
    };
    
    mensagemDiv.style.background = cores[tipo] || cores.info;
    mensagemDiv.textContent = texto;
    mensagemDiv.style.display = 'block';
    mensagemDiv.style.animation = 'slideIn 0.3s ease';
    
    // Remover após 3 segundos
    setTimeout(() => {
        mensagemDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            mensagemDiv.style.display = 'none';
        }, 300);
    }, 3000);
}

function mostrarMensagemModal(mensagem) {
    const modal = document.getElementById('modal-confirmacao');
    const texto = document.getElementById('modal-mensagem');
    
    if (modal && texto) {
        texto.textContent = mensagem;
        modal.style.display = 'flex';
    }
}

function fecharModal() {
    const modal = document.getElementById('modal-confirmacao');
    if (modal) {
        modal.style.display = 'none';
    }
}

function mostrarLoading(texto = 'Processando...') {
    const overlay = document.getElementById('loading-overlay');
    const textoElement = document.getElementById('loading-text');
    
    if (overlay && textoElement) {
        textoElement.textContent = texto;
        overlay.style.display = 'flex';
    }
}

function esconderLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function configurarTeclas() {
    document.addEventListener('keydown', function(event) {
        // Ctrl + Enter salva viagem
        if (event.ctrlKey && event.key === 'Enter') {
            event.preventDefault();
            salvarViagem();
        }
        
        // Esc limpa formulário
        if (event.key === 'Escape') {
            event.preventDefault();
            limparFormulario();
        }
    });
}

function exportarParaExcel() {
    if (viagens.length === 0) {
        mostrarMensagem('Não há viagens para exportar', 'aviso');
        return;
    }
    
    let csv = 'Data,Horário,Motorista,Origem,Destino,Passageiro,Observações,Link WhatsApp\n';
    
    viagens.forEach(v => {
        csv += `"${v.data || ''}","${v.horario || ''}","${v.motorista || ''}",`;
        csv += `"${v.origem || ''}","${v.destino || ''}","${v.passageiro || ''}",`;
        csv += `"${v.observacoes || ''}","${v.whatsappLink || ''}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `viagens_xcmg_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    mostrarMensagem(`Exportadas ${viagens.length} viagens para CSV`, 'sucesso');
}

// ==================== EXPORTAR FUNÇÕES GLOBAIS ====================
window.salvarViagem = salvarViagem;
window.gerarWhatsApp = gerarWhatsApp;
window.limparFormulario = limparFormulario;
window.filtrarViagens = filtrarViagens;
window.recarregarViagens = recarregarViagens;
window.abrirWhatsAppExistente = abrirWhatsAppExistente;
window.editarViagem = editarViagem;
window.excluirViagem = excluirViagem;
window.exportarParaExcel = exportarParaExcel;
window.fecharModal = fecharModal;
window.atualizarCampos = atualizarCampos;
window.adicionarPassageiro = adicionarPassageiro;
window.removerPassageiro = removerPassageiro;