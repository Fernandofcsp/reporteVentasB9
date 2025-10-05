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

        // Llamar a la API original exactamente como es
        const apiUrl = `https://back-back9.realvirtual.com.mx/api/client/reports/sales?idEmpresa=17&startDate=${mes}-01&endDate=${mes}-30`;
        console.log('🔗 Proxy simple - Llamando a API original:', apiUrl);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`Error API original: ${response.status}`);
        }

        // Obtener los datos exactos de la API original
        const originalData = await response.json();
        
        console.log('✅ Datos originales recibidos - Status:', originalData.status);
        console.log('📊 Total original:', originalData.data?.total);
        console.log('📝 Registros en report:', originalData.data?.report?.length || 0);
        
        // Devolver exactamente los mismos datos que la API original
        return res.status(200).json(originalData);

    } catch (error) {
        console.error('❌ Error en proxy simple:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
}

module.exports = handler;