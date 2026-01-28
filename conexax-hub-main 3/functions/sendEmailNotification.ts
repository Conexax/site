import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const payload = await req.json();
        
        // Exemplo: enviar email para novos leads
        if (payload.event?.entity_name === "Lead" && payload.event?.type === "create") {
            const lead = payload.data;
            
            await base44.integrations.Core.SendEmail({
                to: user.email,
                subject: `Novo Lead: ${lead.name}`,
                body: `
                    Um novo lead foi criado no sistema:
                    
                    Nome: ${lead.name}
                    Email: ${lead.email || 'Não informado'}
                    Telefone: ${lead.phone || 'Não informado'}
                    Origem: ${lead.source || 'Não informada'}
                    
                    Acesse o sistema para mais detalhes.
                `
            });
        }

        return Response.json({ 
            success: true,
            message: "Email enviado com sucesso" 
        });
    } catch (error) {
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});