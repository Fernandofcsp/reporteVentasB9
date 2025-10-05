const express = require('express');
const app = express();

// Middleware para CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// Página de documentación de la API
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Reporte de Ventas B9</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .method { color: #fff; background: #4CAF50; padding: 5px 10px; border-radius: 3px; font-weight: bold; }
        code { background: #e8e8e8; padding: 2px 5px; border-radius: 3px; }
        .example { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin-top: 10px; }
    </style>
</head>
<body>
    <h1>🚀 API Reporte de Ventas B9</h1>
    <p>Esta API proporciona un proxy para obtener reportes de ventas desde el sistema B9.</p>
    
    <div class="endpoint">
        <h3><span class="method">GET</span> /api/ventas</h3>
        <p><strong>Descripción:</strong> Obtiene el reporte de ventas para un mes específico</p>
        <p><strong>Parámetros:</strong></p>
        <ul>
            <li><code>mes</code> (requerido): Fecha en formato YYYY-MM (ej: 2024-10)</li>
        </ul>
        
        <div class="example">
            <strong>Ejemplo de uso:</strong><br>
            <code>GET /api/ventas?mes=2024-10</code>
        </div>
    </div>
    
    <h3>📊 Respuesta</h3>
    <p>La API devuelve un objeto JSON con la siguiente estructura:</p>
    <pre><code>{
  "status": "success",
  "data": {
    "total": 8237194.18,
    "report": [...]
  }
}</code></pre>
    
    <h3>🔗 Estado del Servicio</h3>
    <p>✅ API funcionando correctamente</p>
    <p>🔄 Última actualización: ${new Date().toLocaleString('es-ES')}</p>
    
    <hr>
    <p><small>Desarrollado para reportes de ventas B9 | Vercel Deployment</small></p>
</body>
</html>
    `);
});

// Redirección para requests de API que lleguen aquí por error
app.get('/api/*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint no encontrado',
        message: 'Esta es la página de inicio. La API está en /api/ventas',
        availableEndpoints: ['/api/ventas?mes=YYYY-MM']
    });
});

// 404 para otras rutas
app.get('*', (req, res) => {
    res.status(404).send('<h1>404 - Página no encontrada</h1><p><a href="/">Volver al inicio</a></p>');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`🚀 Servidor Express ejecutándose en puerto ${port}`);
});

module.exports = app;