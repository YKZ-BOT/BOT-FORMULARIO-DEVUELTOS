const { App } = require('@slack/bolt');
const fs = require('fs');
const path = require('path');

// Configuración del bot con Socket Mode
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN
});

// Archivo para guardar el turno actual
const STATE_FILE = path.join(__dirname, 'turno_estado.json');

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

// Inicia el bot con Socket Mode
(async () => {
  await app.start();
  console.log('⚡ Bot de rotación iniciado correctamente con Socket Mode');
})();
