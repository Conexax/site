import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Atualizar métricas automaticamente
        const clients = await base44.asServiceRole.entities.Client.filter({ status: 'active' });
        let updated = 0;

        for (const client of clients) {
            const orders = await base44.asServiceRole.entities.Order.filter({ 
                provider: 'kiwify',
                status: 'pago'
            });
            
            const clientOrders = orders.filter(o => 
                o.customerEmail === client.email
            );

            if (clientOrders.length > 0) {
                const totalRevenue = clientOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
                const avgTicket = totalRevenue / clientOrders.length;

                const currentMonth = new Date().toISOString().slice(0, 7);
                
                await base44.asServiceRole.entities.Metric.create({
                    client_id: client.id,
                    period: currentMonth,
                    monthly_revenue: totalRevenue,
                    orders_count: clientOrders.length,
                    average_ticket: avgTicket
                });
                
                updated++;
            }
        }

        return Response.json({ 
            success: true,
            message: `${updated} métricas atualizadas` 
        });
    } catch (error) {
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});