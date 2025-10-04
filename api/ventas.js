const fetch = require('node-fetch');

async function handler(req, res) {
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

        // Llamar a la API correcta con el total exacto
        const apiUrl = `https://back-back9.realvirtual.com.mx/api/client/reports/sales?idEmpresa=17&startDate=${mes}-01&endDate=${mes}-30`;
        console.log('🔗 Llamando a API sales report:', apiUrl);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`Error API sales report: ${response.status}`);
        }

        const salesData = await response.json();

        console.log('✅ Datos recibidos de API sales report');
        
        // Verificar que tenemos la estructura correcta
        if (!salesData.data || !salesData.data.report || !Array.isArray(salesData.data.report)) {
            throw new Error('Estructura de respuesta inválida en Sales API');
        }
        
        const tickets = salesData.data.report;
        console.log(`📊 Total de tickets encontrados: ${tickets.length}`);
        
        // Obtener también los datos de vendedores para la estructura
        const vendedoresUrl = `https://back-back9.realvirtual.com.mx/ventas-vendedores/?empresa=1&fecha_desde=${mes}-01&fecha_hasta=${mes}-30`;
        console.log('🔗 Llamando también a API vendedores para estructura:', vendedoresUrl);
        
        const vendedoresResponse = await fetch(vendedoresUrl);
        const vendedoresData = await vendedoresResponse.ok ? await vendedoresResponse.json() : { data: { vendedores: [] } };
        
        // Calcular el total exacto de la API sales
        let totalCalculadoDeSales = 0;
        if (tickets && Array.isArray(tickets)) {
            totalCalculadoDeSales = tickets.reduce((sum, item) => {
                const importe = parseFloat(item.Importe) || 0;
                return sum + importe;
            }, 0);
        }
        
        console.log('🔍 Total calculado de Sales API:', totalCalculadoDeSales);
        console.log('🔍 Cantidad de registros en Sales API:', tickets.length);
        
        if (!Array.isArray(tickets)) {
            throw new Error('Formato de respuesta inválido en Sales API');
        }

        // Procesar métodos de pago usando los datos de Sales API
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

        // Procesar todos los tickets de la Sales API
        tickets.forEach(ticket => {
            const metodoPago = (ticket.Metodo_pago || '').trim();
            const importe = parseFloat(ticket.Importe) || 0;

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

        console.log('📊 Resumen calculado:', resumenMetodosPago);

        // Respuesta final con el total exacto de la Sales API
        const totalGeneral = totalCalculadoDeSales; // Total exacto de Sales API
        const totalExacto = totalCalculadoDeSales;   // Total exacto de Sales API
        
        const resultado = {
            success: true,
            data: {
                mes: mes,
                totalGeneral: totalGeneral,
                totalExacto: totalExacto,
                totalVendedores: vendedoresData?.data?.totalVendedores || 0,
                totalTickets: tickets.length,
                vendedores: vendedoresData?.data?.vendedores || [],
                resumenMetodosPago: resumenMetodosPago,
                fechaConsulta: new Date().toISOString(),
                salesApiTotal: totalCalculadoDeSales
            }
        };

        console.log('🚀 Total final enviado:', totalGeneral);
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

module.exports = { default: handler };