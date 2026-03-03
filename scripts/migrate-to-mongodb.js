// scripts/migrate-to-mongodb.js
// Migra i dati dai file JSON locali a MongoDB Atlas
// Uso: MONGODB_URI=mongodb+srv://... node scripts/migrate-to-mongodb.js

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI non configurato nel .env');
  process.exit(1);
}

const {
  UserModel, ArchitectModel, ActivationTokenModel, CourseModel,
  NewsModel, ConversationModel, MessageModel, EnrollmentModel, NotificationModel
} = require('../src/models');

const DATA_DIR = path.join(__dirname, '../data');

const readJson = (file) => {
  const filePath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) || [];
  } catch {
    return [];
  }
};

const migrate = async (Model, file, label) => {
  const data = readJson(file);
  if (!data.length) {
    console.log(`   ⚠️  ${label}: nessun dato da migrare`);
    return;
  }
  try {
    await Model.deleteMany({});
    await Model.insertMany(data, { ordered: false });
    console.log(`   ✅ ${label}: ${data.length} record migrati`);
  } catch (err) {
    console.error(`   ❌ ${label}: errore —`, err.message);
  }
};

const run = async () => {
  console.log('\n🚀 Migrazione JSON → MongoDB Atlas\n');

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connesso a MongoDB Atlas\n');

  await migrate(UserModel,            'users.json',              'Users');
  await migrate(ArchitectModel,       'architects.json',         'Architects');
  await migrate(ActivationTokenModel, 'activation-tokens.json',  'ActivationTokens');
  await migrate(CourseModel,          'courses.json',            'Courses');
  await migrate(NewsModel,            'news.json',               'News');
  await migrate(ConversationModel,    'conversations.json',      'Conversations');
  await migrate(MessageModel,         'messages.json',           'Messages');
  await migrate(EnrollmentModel,      'enrollments.json',        'Enrollments');
  await migrate(NotificationModel,    'notifications.json',      'Notifications');

  console.log('\n✅ Migrazione completata!');
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(err => {
  console.error('❌ Errore migrazione:', err);
  process.exit(1);
});
