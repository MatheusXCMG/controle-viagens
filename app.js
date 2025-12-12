// ==================== ATUALIZAR VIAGEM ====================
async function atualizarViagem(id, dados) {
    console.log('✏️ Atualizando viagem ID:', id, dados);
    
    try {
        // Preparar payload - compatível com sua tabela
        const payload = {
            data: dados.data,
            horario: dados.horario,
            motorista: dados.motorista,
            origem: dados.origem,
            destino: dados.destino,
            passageiro: dados.passageiro || '',
            observacoes: dados.observacoes || '',
            whatsapp_link: this.gerarLinkWhatsApp(dados),
            sincronizado: true,
            origem_dados: 'online'
        };
        
        console.log('📤 Payload para atualização:', payload);
        
        const response = await fetch(`${this.config.supabaseUrl}/rest/v1/${this.tableName}?id=eq.${id}`, {
            method: 'PATCH',
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
            console.error('❌ Erro ao atualizar:', erroTexto);
            throw new Error(`HTTP ${response.status}: ${erroTexto}`);
        }
        
        const resultado = await response.json();
        console.log('✅ Atualizado com sucesso:', resultado);
        
        // Limpar cache para forçar atualização
        this.limparCache();
        
        return {
            success: true,
            message: '✅ Viagem atualizada com sucesso!',
            mode: 'online',
            data: resultado[0]
        };
        
    } catch (error) {
        console.error('❌ Erro ao atualizar viagem:', error);
        return {
            success: false,
            message: '❌ Erro ao atualizar viagem: ' + error.message
        };
    }
}

// ==================== EXCLUIR VIAGEM ====================
async function excluirViagem(id) {
    console.log('🗑️ Excluindo viagem ID:', id);
    
    try {
        const response = await fetch(`${this.config.supabaseUrl}/rest/v1/${this.tableName}?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': this.config.supabaseKey,
                'Authorization': `Bearer ${this.config.supabaseKey}`,
                'Prefer': 'return=representation'
            }
        });
        
        console.log('📥 Resposta status:', response.status);
        
        if (!response.ok) {
            const erroTexto = await response.text();
            console.error('❌ Erro ao excluir:', erroTexto);
            throw new Error(`HTTP ${response.status}: ${erroTexto}`);
        }
        
        console.log('✅ Excluído com sucesso');
        
        // Limpar cache para forçar atualização
        this.limparCache();
        
        return {
            success: true,
            message: 'Viagem excluída do servidor'
        };
        
    } catch (error) {
        console.error('❌ Erro ao excluir viagem:', error);
        return {
            success: false,
            message: 'Erro ao excluir viagem: ' + error.message
        };
    }
}