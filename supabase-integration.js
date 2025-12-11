// supabase-integration.js
// Integração com Supabase - Sistema de Controle de Viagens

class SupabaseIntegration {
    constructor() {
        // ==== CREDENCIAIS DO SUPABASE ====
        this.config = {
            supabaseUrl: "https://mnkhjittwjmybjipspwp.supabase.co",
            supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ua2hqaXR0d2pteWJqaXBzcHdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTAzMTksImV4cCI6MjA4MTAyNjMxOX0.EqO2SPaevPDdEo7vjDZQNyUXKiVurxROy9lcTxTn4Ic"
        };
        
        this.cacheKey = 'viagens_cache';
        this.offlineKey = 'viagens_offline';
        this.isOnline = navigator.onLine;
        
        console.log('🚀 Supabase Integration iniciado');
    }
    
    // ==================== TESTE DE CONEXÃO ====================
    async testarConexao() {
        try {
            console.log('🔍 Testando conexão com Supabase...');
            
            const response = await fetch(`${this.config.supabaseUrl}/rest/v1/viagens?select=count`, {
                method: 'GET',
                headers: {
                    'apikey': this.config.supabaseKey,
                    'Authorization': `Bearer ${this.config.supabaseKey}`,
                    'Range': '0-0'
                }
            });
            
            console.log('📡 Status:', response.status);
            
            if (response.ok) {
                console.log('✅ SUPABASE CONECTADO COM SUCESSO!');
                this.isOnline = true;
                this.atualizarStatusUI(true);
                return true;
            } else {
                const erro = await response.text();
                console.error('❌ Erro do Supabase:', erro);
                this.isOnline = false;
                this.atualizarStatusUI(false);
                return false;
            }
            
        } catch (error) {
            console.error('❌ Falha na conexão:', error.message);
            this.isOnline = false;
            this.atualizarStatusUI(false);
            return false;
        }
    }
    
    atualizarStatusUI(conectado) {
        const statusElement = document.getElementById('status-conexao');
        if (!statusElement) return;
        
        if (conectado) {
            statusElement.innerHTML = '<i class="fas fa-database"></i> Conectado ao Supabase';
            statusElement.className = 'status-bar online';
        } else {
            statusElement.innerHTML = '<i class="fas fa-database"></i> Supabase Offline';
            statusElement.className = 'status-bar offline';
        }
    }
    
    // ==================== SALVAR VIAGEM ====================
    async salvarViagem(dados) {
        console.log('💾 Salvando viagem...', dados);
        
        // Validar dados obrigatórios
        if (!this.validarDados(dados)) {
            return {
                success: false,
                message: 'Preencha todos os campos obrigatórios (*)'
            };
        }
        
        // Tentar online primeiro
        if (this.isOnline) {
            try {
                const resultado = await this.salvarOnline(dados);
                return resultado;
            } catch (error) {
                console.warn('⚠️ Falha online, salvando offline:', error);
                this.isOnline = false;
                this.atualizarStatusUI(false);
            }
        }
        
        // Fallback: salvar offline
        return this.salvarOffline(dados);
    }
    
    async salvarOnline(dados) {
        console.log('🌐 Enviando para Supabase...');
        
        // Preparar payload
        const payload = {
            data: dados.data,
            horario: dados.horario,
            motorista: dados.motorista,
            origem: dados.origem,
            destino: dados.destino,
            passageiro: dados.passageiro || null,
            observacoes: dados.observacoes || null,
            whatsapp_link: this.gerarLinkWhatsApp(dados),
            sincronizado: true,
            origem_dados: 'online',
            criado_em: new Date().toISOString()
        };
        
        console.log('📤 Payload:', payload);
        
        const response = await fetch(`${this.config.supabaseUrl}/rest/v1/viagens`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': this.config.supabaseKey,
                'Authorization': `Bearer ${this.config.supabaseKey}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(payload)
        });
        
        console.log('📥 Resposta status:', response.status);
        
        if (!response.ok) {
            const erroTexto = await response.text();
            throw new Error(`HTTP ${response.status}: ${erroTexto}`);
        }
        
        const resultado = await response.json();
        console.log('✅ Salvo com sucesso:', resultado);
        
        // Limpar cache para forçar atualização
        this.limparCache();
        
        return {
            success: true,
            message: '✅ Viagem salva no Supabase!',
            mode: 'online',
            data: resultado[0]
        };
    }
    
    salvarOffline(dados) {
        console.log('📱 Salvando localmente (offline)...');
        
        try {
            // Obter viagens offline existentes
            let viagensOffline = [];
            try {
                viagensOffline = JSON.parse(localStorage.getItem(this.offlineKey) || '[]');
            } catch (e) {
                console.warn('⚠️ Erro ao ler dados offline, inicializando array vazio');
            }
            
            // Criar novo registro
            const novoRegistro = {
                id: 'offline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                data: dados.data,
                horario: dados.horario,
                motorista: dados.motorista,
                origem: dados.origem,
                destino: dados.destino,
                passageiro: dados.passageiro || null,
                observacoes: dados.observacoes || null,
                whatsapp_link: this.gerarLinkWhatsApp(dados),
                criado_em: new Date().toISOString(),
                sincronizado: false,
                origem_dados: 'offline'
            };
            
            // Adicionar no início
            viagensOffline.unshift(novoRegistro);
            
            // Salvar no localStorage
            localStorage.setItem(this.offlineKey, JSON.stringify(viagensOffline));
            
            console.log('💾 Salvo offline:', novoRegistro);
            
            return {
                success: true,
                message: '📱 Viagem salva localmente. Será sincronizada automaticamente quando a conexão voltar.',
                mode: 'offline',
                data: novoRegistro
            };
            
        } catch (error) {
            console.error('❌ Erro ao salvar offline:', error);
            return {
                success: false,
                message: '❌ Erro ao salvar. Tente novamente.'
            };
        }
    }
    
    // ==================== GERAR LINK WHATSAPP ====================
    gerarLinkWhatsApp(dados) {
        const motorista = dados.motorista;
        
        // Formatar data brasileira
        const dataObj = new Date(dados.data);
        const dataFormatada = dataObj.toLocaleDateString('pt-BR');
        
        let mensagem = `NOVA VIAGEM PROGRAMADA - XCMG\n`;
        mensagem += `\n📅 Data: ${dataFormatada}`;
        mensagem += `\n⏰ Horário: ${dados.horario}`;
        mensagem += `\n👤 Motorista: ${motorista}`;
        mensagem += `\n📍 Origem: ${dados.origem}`;
        mensagem += `\n🎯 Destino: ${dados.destino}`;
        
        // Informações específicas por motorista
        if (motorista === 'Van') {
            // Processar passageiros da Van
            if (dados.passageiro) {
                const passageirosArray = dados.passageiro.split(' | ');
                mensagem += `\n\n👥 PASSAGEIROS:`;
                passageirosArray.forEach((p, i) => {
                    const [nome, doc] = p.split(' - ');
                    mensagem += `\n${i + 1}. ${nome || 'N/A'} - ${doc || 'Sem documento'}`;
                });
            }
        } else if (motorista === 'Uber' && dados.passageiro) {
            mensagem += `\n👤 Passageiro: ${dados.passageiro}`;
        }
        
        if (dados.observacoes) {
            mensagem += `\n\n📝 Observações: ${dados.observacoes}`;
        }
        
        mensagem += `\n\n---\nSistema de Controle de Viagens XCMG`;
        
        return `https://api.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`;
    }
    
    // ==================== BUSCAR VIAGENS ====================
    async buscarViagens(forcarAtualizacao = false) {
        console.log('🔍 Buscando viagens...');
        
        // Se offline ou temos cache recente, usar cache
        if (!this.isOnline || (!forcarAtualizacao && this.getCache())) {
            const cache = this.getCache();
            if (cache) {
                console.log('📂 Usando cache local');
                return cache;
            }
            
            console.log('📴 Modo offline - retornando dados locais');
            return this.getDadosOffline();
        }
        
        // Tentar buscar online
        try {
            console.log('🌐 Buscando do Supabase...');
            
            const response = await fetch(`${this.config.supabaseUrl}/rest/v1/viagens?select=*&order=created_at.desc`, {
                method: 'GET',
                headers: {
                    'apikey': this.config.supabaseKey,
                    'Authorization': `Bearer ${this.config.supabaseKey}`,
                    'Range': '0-999'
                }
            });
            
            console.log('📥 Status da busca:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const dadosOnline = await response.json();
            console.log(`📊 Recebidas ${dadosOnline.length} viagens do Supabase`);
            
            // Combinar com dados offline pendentes
            const dadosOffline = this.getDadosOffline().filter(v => !v.sincronizado);
            const todasViagens = [...dadosOffline, ...dadosOnline];
            
            // Formatar para o sistema
            const viagensFormatadas = todasViagens.map(item => ({
                id: item.id,
                data: item.data,
                horario: item.horario,
                motorista: item.motorista,
                origem: item.origem,
                destino: item.destino,
                passageiro: item.passageiro,
                observacoes: item.observacoes,
                whatsappLink: item.whatsapp_link,
                criadoEm: item.criado_em || item.created_at,
                sincronizado: item.sincronizado !== false,
                origemDados: item.origem_dados || 'supabase'
            }));
            
            // Salvar em cache
            this.setCache(viagensFormatadas);
            
            return viagensFormatadas;
            
        } catch (error) {
            console.error('❌ Erro ao buscar online:', error);
            this.isOnline = false;
            this.atualizarStatusUI(false);
            
            // Retornar dados offline
            return this.getDadosOffline();
        }
    }
    
    // ==================== SINCRONIZAÇÃO ====================
    async sincronizarPendentes() {
        if (!this.isOnline) {
            console.log('📴 Offline - não pode sincronizar');
            return { success: false, sincronizados: 0 };
        }
        
        const pendentes = this.getDadosOffline().filter(v => !v.sincronizado);
        
        if (pendentes.length === 0) {
            console.log('✅ Nenhuma viagem pendente para sincronizar');
            return { success: true, sincronizados: 0 };
        }
        
        console.log(`🔄 Sincronizando ${pendentes.length} viagens pendentes...`);
        
        let sucessos = 0;
        let falhas = 0;
        
        for (const pendente of pendentes) {
            try {
                // Preparar dados para envio (remover campos internos)
                const { id, origem_dados, sincronizado, ...dadosEnvio } = pendente;
                
                const response = await fetch(`${this.config.supabaseUrl}/rest/v1/viagens`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': this.config.supabaseKey,
                        'Authorization': `Bearer ${this.config.supabaseKey}`,
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(dadosEnvio)
                });
                
                if (response.ok) {
                    // Marcar como sincronizado no localStorage
                    const dadosOffline = this.getDadosOffline();
                    const index = dadosOffline.findIndex(v => v.id === id);
                    if (index !== -1) {
                        dadosOffline[index].sincronizado = true;
                        localStorage.setItem(this.offlineKey, JSON.stringify(dadosOffline));
                    }
                    
                    sucessos++;
                    console.log(`✅ Sincronizado: ${pendente.motorista}`);
                } else {
                    falhas++;
                    console.error(`❌ Falha: ${pendente.motorista} - Status: ${response.status}`);
                }
                
            } catch (error) {
                falhas++;
                console.error(`❌ Erro ao sincronizar ${pendente.motorista}:`, error);
            }
        }
        
        // Limpar cache para forçar atualização
        this.limparCache();
        
        console.log(`📊 Sincronização: ${sucessos} sucessos, ${falhas} falhas`);
        
        return {
            success: sucessos > 0,
            sincronizados: sucessos,
            falhas: falhas
        };
    }
    
    // ==================== MÉTODOS AUXILIARES ====================
    
    validarDados(dados) {
        return dados.data && 
               dados.horario && 
               dados.motorista && 
               dados.origem && 
               dados.destino;
    }
    
    getDadosOffline() {
        try {
            const dados = JSON.parse(localStorage.getItem(this.offlineKey) || '[]');
            // Garantir que todos os registros têm ID
            return dados.map((item, index) => ({
                ...item,
                id: item.id || `offline_${Date.now()}_${index}`
            }));
        } catch (error) {
            console.warn('⚠️ Erro ao ler dados offline:', error);
            return [];
        }
    }
    
    setCache(data) {
        const cacheData = {
            data: data,
            timestamp: Date.now(),
            expiry: 2 * 60 * 1000 // 2 minutos
        };
        localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
    }
    
    getCache() {
        try {
            const cached = JSON.parse(localStorage.getItem(this.cacheKey));
            if (cached && (Date.now() - cached.timestamp) < cached.expiry) {
                return cached.data;
            }
        } catch (error) {
            console.warn('⚠️ Erro ao ler cache:', error);
        }
        return null;
    }
    
    limparCache() {
        localStorage.removeItem(this.cacheKey);
    }
}

// Instância global
window.supabase = new SupabaseIntegration();

// Inicialização automática
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 Supabase Integration carregado');
    
    // Testar conexão após 1 segundo
    setTimeout(async () => {
        await window.supabase.testarConexao();
    }, 1000);
    
    // Monitorar mudanças de conexão
    window.addEventListener('online', () => {
        console.log('🌐 Conexão restaurada');
        window.supabase.isOnline = true;
        window.supabase.atualizarStatusUI(true);
        
        // Sincronizar pendentes após 2 segundos
        setTimeout(async () => {
            const resultado = await window.supabase.sincronizarPendentes();
            if (resultado.sincronizados > 0) {
                console.log(`🔄 ${resultado.sincronizados} viagens sincronizadas`);
                // Recarregar a lista de viagens
                if (typeof carregarViagens === 'function') {
                    carregarViagens();
                }
            }
        }, 2000);
    });
    
    window.addEventListener('offline', () => {
        console.log('📴 Conexão perdida');
        window.supabase.isOnline = false;
        window.supabase.atualizarStatusUI(false);
    });
    
    // Sincronizar a cada 5 minutos se online
    setInterval(() => {
        if (window.supabase.isOnline) {
            window.supabase.sincronizarPendentes();
        }
    }, 5 * 60 * 1000);
});