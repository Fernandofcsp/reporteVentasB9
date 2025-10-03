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
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`Error API: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success || !data.data) {
            throw new Error('Formato de respuesta inválido');
        }

        // Procesar los datos para agregar análisis de métodos de pago
        const vendedores = data.data.vendedores.map(vendedor => {
            // Objeto para contar métodos de pago
            const metodoPagoStats = {
                'credit_card': { total: 0, cantidad: 0 },
                'cash': { total: 0, cantidad: 0 },
                'debit_card': { total: 0, cantidad: 0 },
                'credit_note_application': { total: 0, cantidad: 0 },
                'transfer': { total: 0, cantidad: 0 },
                'check': { total: 0, cantidad: 0 },
                'credit': { total: 0, cantidad: 0 },
                'mixed': { total: 0, cantidad: 0 } // Para métodos combinados
            };

            // Debug: mostrar algunos métodos de pago para verificar el formato
            if (vendedor.tickets && vendedor.tickets.length > 0) {
                console.log(`📝 Primeros 3 métodos de pago para ${vendedor.nombre}:`, 
                    vendedor.tickets.slice(0, 3).map(t => `"${t.metodoPago}"`));
            }

            // Procesar cada ticket
            vendedor.tickets.forEach(ticket => {
                const metodoPago = ticket.metodoPago || '';
                const importe = parseFloat(ticket.importe) || 0;

                // Verificar si es un método combinado (contiene coma)
                if (metodoPago.includes(',')) {
                    metodoPagoStats.mixed.total += importe;
                    metodoPagoStats.mixed.cantidad += 1;
                } else {
                    // Método único - usar el valor exacto de la API
                    const metodo = metodoPago.trim();
                    
                    // Mapear métodos exactos como vienen de la API
                    if (metodo === 'credit_card') {
                        metodoPagoStats.credit_card.total += importe;
                        metodoPagoStats.credit_card.cantidad += 1;
                    } else if (metodo === 'cash') {
                        metodoPagoStats.cash.total += importe;
                        metodoPagoStats.cash.cantidad += 1;
                    } else if (metodo === 'debit_card') {
                        metodoPagoStats.debit_card.total += importe;
                        metodoPagoStats.debit_card.cantidad += 1;
                    } else if (metodo === 'credit_note_application') {
                        metodoPagoStats.credit_note_application.total += importe;
                        metodoPagoStats.credit_note_application.cantidad += 1;
                    } else if (metodo === 'transfer') {
                        metodoPagoStats.transfer.total += importe;
                        metodoPagoStats.transfer.cantidad += 1;
                    } else if (metodo === 'check') {
                        metodoPagoStats.check.total += importe;
                        metodoPagoStats.check.cantidad += 1;
                    } else if (metodo === 'credit') {
                        metodoPagoStats.credit.total += importe;
                        metodoPagoStats.credit.cantidad += 1;
                    } else {
                        // Si no reconocemos el método, agregarlo a mixed con información de debug
                        console.log(`⚠️ Método de pago no reconocido: "${metodo}"`);
                        metodoPagoStats.mixed.total += importe;
                        metodoPagoStats.mixed.cantidad += 1;
                    }
                }
            });

            // Agregar estadísticas al vendedor
            return {
                ...vendedor,
                metodoPagoAnalisis: metodoPagoStats
            };
        });

        // Calcular totales generales por método de pago
        const totalesMetodoPago = {
            'credit_card': { total: 0, cantidad: 0 },
            'cash': { total: 0, cantidad: 0 },
            'debit_card': { total: 0, cantidad: 0 },
            'credit_note_application': { total: 0, cantidad: 0 },
            'transfer': { total: 0, cantidad: 0 },
            'check': { total: 0, cantidad: 0 },
            'credit': { total: 0, cantidad: 0 },
            'mixed': { total: 0, cantidad: 0 }
        };

        vendedores.forEach(vendedor => {
            Object.keys(totalesMetodoPago).forEach(metodo => {
                totalesMetodoPago[metodo].total += vendedor.metodoPagoAnalisis[metodo].total;
                totalesMetodoPago[metodo].cantidad += vendedor.metodoPagoAnalisis[metodo].cantidad;
            });
        });

        console.log('📊 Totales métodos de pago:', totalesMetodoPago);

        // Preparar respuesta con datos originales + análisis
        const resultado = {
            success: data.success,
            data: {
                mes: data.data.mes,
                totalGeneral: data.data.totalGeneral,
                totalVendedores: data.data.totalVendedores,
                totalTickets: data.data.totalTickets,
                vendedores: vendedores,
                resumenMetodosPago: totalesMetodoPago,
                fechaConsulta: data.data.fechaConsulta
            }
        };

        return res.status(200).json(resultado);

    } catch (error) {
        console.error('Error en proxy:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
}