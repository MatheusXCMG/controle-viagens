// app.js - Sistema de Controle de Viagens com Motoristas Pré-selecionados

// ==================== VARIÁVEIS GLOBAIS ====================
let viagens = [];
let filtroAtual = '';

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
    
    // Configurar tecla Enter no formulário
    configurarTeclas();
});

// ==================== FUNÇÕES PARA MOTORISTAS ====================

function atualizarCampos() {
    const motorista = document.getElementById('motorista').value;
    const camposVan = document.getElementById('campos-van');
    const passageiroInput = document.getElementById('passageiro');
    
    // Mostrar/ocultar campos da Van
    if (motorista === 'Van') {
        camposVan.style.display = 'block';
        passageiroInput.placeholder = 'Informações adicionais (opcional)';
        // Limpar campo passageiro quando selecionar Van
        passageiroInput.value = '';
    } else {
        camposVan.style.display = 'none';
        passageiroInput.placeholder = 'Opcional';
        
        // Resetar campos da Van
        document.getElementById('nome-passageiro').value = '';
        document.getElementById('documento-passageiro').value = '';
        document.getElementById('nome-passageiro').style.borderColor = '#e0e0e0';
        document.getElementById('documento-passageiro').style.borderColor = '#e0e0e0';
    }
    
    // Auto-preencher origem padrão para XCMG
    if (motorista && !document.getElementById('origem').value) {
        document.getElementById('origem').value = 'XCMG Brasil Indústria';
    }
    
    // Auto-preencher destino sugerido
    if (motorista && !document.getElementById('destino').value) {
        document.getElementById('destino').value = 'Campinas, Jundiai, Barueri e Guarulhos';
    }
}

// ==================== FUNÇÕES PRINCIPAIS ====================

// CARREGAR VIAGENS
async function carregarViagens() {
    mostrarLoading('Carregando viagens...');
    
    try {
        viagens = await window.supabase.buscarViagens();
        console.log(`📊 ${viagens.length} viagens carregadas`);
        
        // Atualizar interface
        atualizarTabela();
        atualizarContador();
        
        // Esconder linha de loading
        const loadingRow = document.getElementById('loading-row');
        if (loadingRow) loadingRow.style.display = 'none';
        
    } catch (error) {
        console.error('❌ Erro ao carregar viagens:', error);
        mostrarMensagem('Erro ao carregar viagens', 'erro');
    } finally {
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
                    status: 'pendente'
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
    const passageiro = document.getElementById('passageiro').value.trim();
    
    // Para Van, juntar nome e documento
    let passageiroCompleto = passageiro;
    if (motorista === 'Van') {
        const nome = document.getElementById('nome-passageiro').value.trim();
        const documento = document.getElementById('documento-passageiro').value.trim();
        if (nome && documento) {
            passageiroCompleto = `${nome} - ${documento}` + (passageiro ? ` | ${passageiro}` : '');
        }
    }
    
    return {
        data: document.getElementById('data').value,
        horario: document.getElementById('horario').value,
        motorista: motorista,
        origem: document.getElementById('origem').value.trim(),
        destino: document.getElementById('destino').value.trim(),
        passageiro: passageiroCompleto,
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
        const nome = document.getElementById('nome-passageiro').value.trim();
        const documento = document.getElementById('documento-passageiro').value.trim();
        
        if (!nome) {
            document.getElementById('nome-passageiro').style.borderColor = '#FF5252';
            valido = false;
        } else {
            document.getElementById('nome-passageiro').style.borderColor = '#e0e0e0';
        }
        
        if (!documento) {
            document.getElementById('documento-passageiro').style.borderColor = '#FF5252';
            valido = false;
        } else {
            document.getElementById('documento-passageiro').style.borderColor = '#e0e0e0';
        }
    }
    
    return valido;
}

function limparFormulario() {
    // Limpar campos
    document.getElementById('motorista').value = '';
    document.getElementById('origem').value = '';
    document.getElementById('destino').value = '';
    document.getElementById('passageiro').value = '';
    document.getElementById('observacoes').value = '';
    document.getElementById('nome-passageiro').value = '';
    document.getElementById('documento-passageiro').value = '';
    document.getElementById('campos-van').style.display = 'none';
    
    // Resetar data para hoje
    const hoje = new Date();
    document.getElementById('data').valueAsDate = hoje;
    
    // Resetar horário padrão
    const proximaHora = new Date(hoje.getTime() + 60 * 60 * 1000);
    document.getElementById('horario').value = 
        proximaHora.getHours().toString().padStart(2, '0') + ':00';
    
    // Resetar validação visual
    ['motorista', 'origem', 'destino', 'nome-passageiro', 'documento-passageiro'].forEach(id => {
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
    
    // Adicionar cada viagem
    viagensParaExibir.forEach(viagem => {
        const row = document.createElement('tr');
        
        // Formatar data (se existir)
        const dataFormatada = viagem.data ? 
            new Date(viagem.data).toLocaleDateString('pt-BR') : '';
        
        // Destacar por tipo de motorista
        let motoristaClass = '';
        if (viagem.motorista === 'Van') motoristaClass = 'van-motorista';
        if (viagem.motorista === 'Uber') motoristaClass = 'uber-motorista';
        
        row.innerHTML = `
            <td>${dataFormatada}</td>
            <td>${viagem.horario || ''}</td>
            <td class="${motoristaClass}"><strong>${viagem.motorista || ''}</strong></td>
            <td>${viagem.origem || ''} → ${viagem.destino || ''}</td>
            <td class="actions-cell">
                ${viagem.whatsappLink ? `
                <button class="action-btn action-whatsapp" onclick="abrirWhatsAppExistente('${viagem.whatsappLink}')">
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
    if (!viagem) return;
    
    // Preencher formulário
    document.getElementById('data').value = viagem.data || '';
    document.getElementById('horario').value = viagem.horario || '';
    document.getElementById('motorista').value = viagem.motorista || '';
    document.getElementById('origem').value = viagem.origem || '';
    document.getElementById('destino').value = viagem.destino || '';
    document.getElementById('passageiro').value = viagem.passageiro || '';
    document.getElementById('observacoes').value = viagem.observacoes || '';
    
    // Atualizar campos baseados no motorista
    atualizarCampos();
    
    // Remover da lista temporariamente
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
        const dadosOffline = JSON.parse(localStorage.getItem('viagens_offline') || '[]');
        const novosDados = dadosOffline.filter(v => v.id !== id);
        localStorage.setItem('viagens_offline', JSON.stringify(novosDados));
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
        mensagemDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 9999;
            animation: slideIn 0.3s ease;
            max-width: 300px;
        `;
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
    
    // Remover após 3 segundos
    setTimeout(() => {
        mensagemDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (mensagemDiv.parentNode) {
                mensagemDiv.parentNode.removeChild(mensagemDiv);
            }
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
    link.download = `viagens_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    mostrarMensagem(`Exportadas ${viagens.length} viagens para CSV`, 'sucesso');
}

// ==================== ANIMAÇÕES CSS DINÂMICAS ====================
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .van-motorista {
        color: #d32f2f;
        font-weight: bold;
    }
    
    .uber-motorista {
        color: #000000;
        font-weight: bold;
    }
`;
document.head.appendChild(style);

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

console.log('✅ Sistema de Controle de Viagens carregado com sucesso!');