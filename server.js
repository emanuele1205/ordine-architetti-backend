// server.js
// Entry point del server - Ordine Architetti P.P.C. Caltanissetta

require('dotenv').config();
const { connectDB } = require('./src/config/db');
const app = require('./src/app');
const config = require('./src/config');

const startServer = async () => {
  // Connessione MongoDB (se MONGODB_URI configurato, altrimenti usa JSON)
  await connectDB();

  // Se MongoDB è connesso, inizializza la cache sync (migra da JSON se necessario)
  const { isMongoConnected } = require('./src/config/db');
  if (isMongoConnected()) {
    try {
      const mongoSyncService = require('./src/services/mongodb-sync.service');
      await mongoSyncService.initialize(config.dataDir);
    } catch (e) {
      console.error('⚠️  Errore inizializzazione MongoDB sync:', e.message);
      console.log('⚠️  Fallback a file JSON locali');
    }
  }

  const server = app.listen(config.port, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║   🏛️  ORDINE ARCHITETTI P.P.C. CALTANISSETTA              ║');
    console.log('║   Backend API v2.0.0                                      ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log(`   ✅ Server avviato su porta ${config.port}`);
    console.log(`   📡 API Base URL: http://localhost:${config.port}/api`);
    console.log(`   🌍 Ambiente: ${config.nodeEnv}`);
    console.log('   ─────────────────────────────────────────────────────');
    console.log('   GET  /api/health       → Health check');
    console.log('   POST /api/auth/login   → Login');
    console.log('   GET  /api/architects   → Albo professionale');
    console.log('   GET  /api/courses      → Corsi CFP');
    console.log('   GET  /api/news         → News');
    console.log('   ─────────────────────────────────────────────────────');
    console.log('');
  });

  // Gestione errori
  process.on('uncaughtException', (err) => {
    console.error('💥 ERRORE NON CATTURATO:', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('💥 PROMISE REJECTION:', reason);
  });

  const gracefulShutdown = (signal) => {
    console.log(`\n📴 ${signal} — chiusura in corso...`);
    server.close(() => {
      console.log('✅ Server chiuso');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  return server;
};

startServer().catch(err => {
  console.error('❌ Errore avvio server:', err);
  process.exit(1);
});
