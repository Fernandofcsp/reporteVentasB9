const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Manejar preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Método no permitido'
    });
  }
  
  try {
    const { mes } = req.query;
    
    if (!mes) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro mes requerido (formato: YYYY-MM)'
      });
    }
    
    // Validar formato de mes
    if (!/^\d{4}-\d{2}$/.test(mes)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de mes inválido. Use YYYY-MM'
      });
    }
    
    // Calcular fechas de inicio y fin del mes
    const [year, month] = mes.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
    
    console.log(`📊 Proxy Vercel - Consultando ventas: ${mes} (${startDate} al ${endDate})`);
    
    // URL de la API original
    const apiUrl = `https://back-back9.realvirtual.com.mx/api/client/reports/sales?idEmpresa=17&startDate=${startDate}&endDate=${endDate}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Proxy-Ventas-B9/1.0'
      },
      timeout: 8000 // 8 segundos timeout
    });
    
    if (!response.ok) {
      throw new Error(`API respondió con ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Validar estructura de respuesta
    if (data.status !== 'SUCCESS' || !data.data || !data.data.report) {
      throw new Error('Formato de respuesta inválido de la API');
    }
    
    const ventas = data.data.report;
    console.log(`✅ ${ventas.length} ventas obtenidas para ${mes}`);
    
    // Procesar datos: agrupar por vendedor
    const ventasPorVendedor = {};
    let totalGeneral = 0;
    
    ventas.forEach(venta => {
      const vendedor = venta.nombreVendedor || 'Sin asignar';
      const importe = parseFloat(venta.Importe) || 0;
      
      if (!ventasPorVendedor[vendedor]) {
        ventasPorVendedor[vendedor] = {
          nombre: vendedor,
          totalVentas: 0,
          cantidadTickets: 0,
          tickets: []
        };
      }
      
      ventasPorVendedor[vendedor].totalVentas += importe;
      ventasPorVendedor[vendedor].cantidadTickets++;
      ventasPorVendedor[vendedor].tickets.push({
        ticket: venta.Ticket,
        cliente: venta.Cliente,
        importe: importe,
        fecha: venta.or_fecha,
        metodoPago: venta.Metodo_pago,
        banco: venta.mpo_banco || null,
        numeroTarjeta: venta.mpo_numero || null,
        uuid: venta.UUID_Factura || null
      });
      
      totalGeneral += importe;
    });
    
    // Convertir a array y ordenar por ventas
    const vendedoresArray = Object.values(ventasPorVendedor)
      .sort((a, b) => b.totalVentas - a.totalVentas);
    
    // Respuesta exitosa
    return res.status(200).json({
      success: true,
      data: {
        mes: mes,
        periodo: {
          inicio: startDate,
          fin: endDate
        },
        totalGeneral: totalGeneral,
        totalVendedores: vendedoresArray.length,
        totalTickets: ventas.length,
        vendedores: vendedoresArray,
        resumen: {
          ventasContado: ventas.filter(v => v.Metodo_pago === 'cash').length,
          ventasTarjeta: ventas.filter(v => v.Metodo_pago === 'credit_card').length,
          importeContado: ventas.filter(v => v.Metodo_pago === 'cash').reduce((sum, v) => sum + (parseFloat(v.Importe) || 0), 0),
          importeTarjeta: ventas.filter(v => v.Metodo_pago === 'credit_card').reduce((sum, v) => sum + (parseFloat(v.Importe) || 0), 0)
        },
        fechaConsulta: new Date().toISOString(),
        proxy: 'Vercel'
      }
    });
    
  } catch (error) {
    console.error('❌ Error en proxy Vercel:', error.message);
    
    // Respuesta de error detallada
    return res.status(500).json({
      success: false,
      error: error.message,
      details: {
        timestamp: new Date().toISOString(),
        proxy: 'Vercel',
        endpoint: 'ventas'
      }
    });
  }
};