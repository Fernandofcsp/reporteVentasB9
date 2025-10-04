export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { mes } = req.query;
        
        if (!mes) {
            return res.status(400).json({ 
                success: false, 
                error: 'El parámetro mes es requerido' 
            });
        }

        // Llamar a la API original
        const apiUrl = `https://back-back9.realvirtual.com.mx/ventas-vendedores/?empresa=1&fecha_desde=${mes}-01&fecha_hasta=${mes}-30`;
        console.log('🔗 Llamando a API:', apiUrl);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`Error API: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Datos recibidos de API original');
        
        if (!data.success || !data.data || !data.data.vendedores) {
            throw new Error('Formato de respuesta inválido');
        }

        // Procesar métodos de pago simplificado
        const resumenMetodosPago = {
            'credit_card': { total: 0, cantidad: 0 },
            'cash': { total: 0, cantidad: 0 },
            'debit_card': { total: 0, cantidad: 0 },
            'credit_note_application': { total: 0, cantidad: 0 },
            'transfer': { total: 0, cantidad: 0 },
            'check': { total: 0, cantidad: 0 },
            'credit': { total: 0, cantidad: 0 },
            'mixed': { total: 0, cantidad: 0 }
        };

        // Procesar todos los tickets de todos los vendedores
        data.data.vendedores.forEach(vendedor => {
            if (vendedor.tickets && Array.isArray(vendedor.tickets)) {
                vendedor.tickets.forEach(ticket => {
                    const metodoPago = (ticket.metodoPago || '').trim();
                    const importe = parseFloat(ticket.importe) || 0;

                    if (metodoPago.includes(',')) {
                        // Método combinado
                        resumenMetodosPago.mixed.total += importe;
                        resumenMetodosPago.mixed.cantidad += 1;
                    } else {
                        // Método único
                        if (resumenMetodosPago[metodoPago]) {
                            resumenMetodosPago[metodoPago].total += importe;
                            resumenMetodosPago[metodoPago].cantidad += 1;
                        } else {
                            console.log(`⚠️ Método no reconocido: "${metodoPago}"`);
                            resumenMetodosPago.mixed.total += importe;
                            resumenMetodosPago.mixed.cantidad += 1;
                        }
                    }
                });
            }
        });

        console.log('📊 Resumen calculado:', resumenMetodosPago);

        // Respuesta final garantizada
        const resultado = {
            success: true,
            data: {
                mes: mes,
                totalGeneral: data.data.totalGeneral,
                totalExacto: data.data.total, // Incluir el total exacto de la API original
                totalVendedores: data.data.totalVendedores,
                totalTickets: data.data.totalTickets,
                vendedores: data.data.vendedores,
                resumenMetodosPago: resumenMetodosPago,
                fechaConsulta: new Date().toISOString()
            }
        };

        console.log('🚀 Enviando respuesta con resumenMetodosPago:', !!resultado.data.resumenMetodosPago);
        
        return res.status(200).json(resultado);

    } catch (error) {
        console.error('❌ Error en proxy:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
}