const { App, ExpressReceiver } = require('@slack/bolt');
const fs = require('fs');
const path = require('path');

// Archivo para guardar el turno actual (en /tmp para Railway)
const STATE_FILE = path.join('/tmp', 'turno_estado.json');

// Lista de funcionarios en rotación
const funcionarios = [
  { nombre: 'Albert Zequeda', slack: '@Albert Zequeda' },
  { nombre: 'Ana Herrera', slack: '@Ana Herrera' },
  { nombre: 'Valeria Vergara', slack: '@Valeria Vergara' },
  { nombre: 'Margarita Silva', slack: '@Margarita Silva' }
];

// Función para leer el estado actual
function leerTurno() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf8');
      const estado = JSON.parse(data);
      return estado.turno;
    }
  } catch (err) {
    console.error('Error leyendo estado:', err);
  }
  return 0; // Por defecto, empieza con el primer funcionario
}

// Función para guardar el estado
function guardarTurno(turno) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({ turno, timestamp: new Date().toISOString() }, null, 2));
  } catch (err) {
    console.error('Error guardando estado:', err);
  }
}

// Función para obtener el siguiente funcionario
function obtenerSiguienteFuncionario() {
  let turnoActual = leerTurno();
  const funcionario = funcionarios[turnoActual];
  
  // Avanza al siguiente turno para la próxima vez
  turnoActual = (turnoActual + 1) % funcionarios.length;
  guardarTurno(turnoActual);
  
  return funcionario;
}

// Crear receiver con Express explícitamente
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET || '',
});

// Configuración del bot
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  receiver: receiver,
});

// Manejo de ruta raíz (GET)
receiver.app.get('/', (req, res) => {
  res.send('🤖 Bot de Rotación de Funcionarios - OK');
});

// Manejo de health check
receiver.app.get('/health', (req, res) => {
  res.json({ status: 'ok', bot: 'slack-rotador', timestamp: new Date().toISOString() });
});

// Detecta mensajes con "Tramites para revision juridica devueltos"
app.message('Tramites para revision juridica devueltos', async ({ message, say }) => {
  try {
    const funcionario = obtenerSiguienteFuncionario();
    
    // Responde en el hilo del mensaje original
    await app.client.chat.postMessage({
      channel: message.channel,
      thread_ts: message.ts,
      text: `Hola 👋 Tu solicitud ha sido recibida.\n\nFue asignada a: *${funcionario.nombre}*\n\nPronte te contactará para ayudarte. ✅`
    });
    
    console.log(`✅ Asignado a: ${funcionario.nombre}`);
  } catch (error) {
    console.error('Error enviando mensaje:', error);
  }
});

// Manejador de errores
app.error(async (error) => {
  console.error('Error en el bot:', error);
});

// Inicia el servidor en el puerto especificado
const PORT = process.env.PORT || 3000;

(async () => {
  await app.start(PORT);
  console.log(`⚡ Bot de rotación escuchando en puerto ${PORT}`);
  console.log(`📡 Webhook disponible en: http://localhost:${PORT}/slack/events`);
  console.log(`🔗 Health check disponible en: http://localhost:${PORT}/health`);
})();
