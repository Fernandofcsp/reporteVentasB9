const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Endpoint de salud
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Proxy B9 Ventas funcionando',
    timestamp: new Date().toISOString()
  });
});

// Proxy para reporte de ventas
app.get('/api/ventas', async (req, res) => {
  try {
    const { mes } = req.query;
    
    if (!mes) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro mes requerido (formato: YYYY-MM)'
      });
    }

    // Calcular fechas de inicio y fin del mes
    const [year, month] = mes.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
    
    // URL de la API original
    const apiUrl = `https://back-back9.realvirtual.com.mx/api/client/reports/sales?idEmpresa=17&startDate=${startDate}&endDate=${endDate}`;
    
    console.log(`📊 Consultando ventas: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API respondió con ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Procesar datos: agrupar por vendedor
    if (data.status === 'SUCCESS' && data.data && data.data.report) {
      const ventas = data.data.report;
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
          banco: venta.mpo_banco
        });
        
        totalGeneral += importe;
      });
      
      // Convertir a array y ordenar por ventas
      const vendedoresArray = Object.values(ventasPorVendedor)
        .sort((a, b) => b.totalVentas - a.totalVentas);
      
      res.json({
        success: true,
        data: {
          mes: mes,
          totalGeneral: totalGeneral,
          totalVendedores: vendedoresArray.length,
          totalTickets: ventas.length,
          vendedores: vendedoresArray,
          fechaConsulta: new Date().toISOString()
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Formato de respuesta inválido de la API'
      });
    }
    
  } catch (error) {
    console.error('❌ Error en proxy de ventas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy B9 Ventas ejecutándose en puerto ${PORT}`);
});