// backend/src/services/mongodb-sync.service.js
// MongoDB-backed data service con API sincrona (compatibile con i controller esistenti)
// Strategia: cache in memoria + salvataggio asincrono in background su MongoDB

const path = require('path');
const fs = require('fs');

let UserModel, ArchitectModel, ActivationTokenModel, CourseModel,
    NewsModel, ConversationModel, MessageModel, EnrollmentModel, NotificationModel;

try {
  const models = require('../models');
  UserModel = models.UserModel;
  ArchitectModel = models.ArchitectModel;
  ActivationTokenModel = models.ActivationTokenModel;
  CourseModel = models.CourseModel;
  NewsModel = models.NewsModel;
  ConversationModel = models.ConversationModel;
  MessageModel = models.MessageModel;
  EnrollmentModel = models.EnrollmentModel;
  NotificationModel = models.NotificationModel;
} catch (e) {
  console.warn('mongodb-sync: modelli non disponibili:', e.message);
}

const { generateId } = require('../utils/helpers');

let cache = {
  users: [],
  architects: [],
  activationTokens: [],
  courses: [],
  news: [],
  messages: [],
  conversations: [],
  enrollments: [],
  notifications: []
};

let initialized = false;

const getModels = () => ({
  users: UserModel,
  architects: ArchitectModel,
  activationTokens: ActivationTokenModel,
  courses: CourseModel,
  news: NewsModel,
  messages: MessageModel,
  conversations: ConversationModel,
  enrollments: EnrollmentModel,
  notifications: NotificationModel
});

const JSON_FILES = {
  users: 'users.json',
  architects: 'architects.json',
  activationTokens: 'activation-tokens.json',
  courses: 'courses.json',
  news: 'news.json',
  messages: 'messages.json',
  conversations: 'conversations.json',
  enrollments: 'enrollments.json',
  notifications: 'notifications.json'
};

const initialize = async (dataDir) => {
  const models = getModels();
  console.log('Inizializzazione cache MongoDB sync...');
  for (const [collection, Model] of Object.entries(models)) {
    if (!Model) { continue; }
    try {
      let docs = await Model.find({}).lean();
      if (docs.length === 0 && dataDir) {
        const jsonFile = JSON_FILES[collection];
        const jsonPath = jsonFile ? path.join(dataDir, jsonFile) : null;
        if (jsonPath && fs.existsSync(jsonPath)) {
          try {
            const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            if (jsonData.length > 0) {
              const docsToInsert = jsonData.map(d => ({ ...d, _id: d._id || generateId() }));
              await Model.insertMany(docsToInsert, { ordered: false }).catch(e => {
                if (e.code !== 11000) throw e;
              });
              docs = docsToInsert;
            }
          } catch (e) { console.error('Migrazione fallita per ' + collection + ':', e.message); }
        }
      }
      cache[collection] = docs;
    } catch (e) { console.error('Errore caricamento ' + collection + ':', e.message); }
  }
  initialized = true;
  console.log('Cache MongoDB sync inizializzata');
};

const isInitialized = () => initialized;

const persistToMongo = (collection, docs) => {
  const Model = getModels()[collection];
  if (!Model || !initialized) return;
  setImmediate(async () => {
    try {
      if (docs.length === 0) { await Model.deleteMany({}); return; }
      const ops = docs.map(doc => ({
        updateOne: { filter: { _id: doc._id }, update: { $set: doc }, upsert: true }
      }));
      await Model.bulkWrite(ops, { ordered: false });
    } catch (e) { console.error('Errore persistenza MongoDB ' + collection + ':', e.message); }
  });
};

const deleteFromMongo = (collection, id) => {
  const Model = getModels()[collection];
  if (!Model || !initialized) return;
  setImmediate(async () => {
    try { await Model.deleteOne({ _id: id }); }
    catch (e) { console.error('Errore eliminazione MongoDB ' + collection + ':', e.message); }
  });
};

const findAll = (collection, filter = null) => {
  const data = cache[collection] || [];
  if (!filter) return [...data];
  return data.filter(item => Object.keys(filter).every(key =>
    filter[key] === undefined ? true : item[key] === filter[key]
  ));
};
const findById = (collection, id) => {
  const data = cache[collection] || [];
  return data.find(item => item._id === id || item.id === id) || null;
};
const findOne = (collection, criteria) => {
  const data = cache[collection] || [];
  return data.find(item => Object.keys(criteria).every(key => item[key] === criteria[key])) || null;
};
const create = (collection, document) => {
  const newDoc = {
    _id: document._id || generateId(),
    ...document,
    createdAt: document.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (!cache[collection]) cache[collection] = [];
  cache[collection] = [...cache[collection], newDoc];
  persistToMongo(collection, cache[collection]);
  return newDoc;
};
const updateById = (collection, id, updates) => {
  const data = cache[collection] || [];
  const index = data.findIndex(item => item._id === id || item.id === id);
  if (index === -1) return null;
  const { _id, createdAt, ...safeUpdates } = updates;
  data[index] = { ...data[index], ...safeUpdates, updatedAt: new Date().toISOString() };
  cache[collection] = data;
  persistToMongo(collection, cache[collection]);
  return data[index];
};
const updateMany = (collection, criteria, updates) => {
  const data = cache[collection] || [];
  let count = 0;
  const { _id, createdAt, ...safeUpdates } = updates;
  data.forEach((item, index) => {
    const matches = Object.keys(criteria).every(key => item[key] === criteria[key]);
    if (matches) { data[index] = { ...item, ...safeUpdates, updatedAt: new Date().toISOString() }; count++; }
  });
  if (count > 0) { cache[collection] = data; persistToMongo(collection, cache[collection]); }
  return count;
};
const deleteById = (collection, id) => {
  const data = cache[collection] || [];
  const index = data.findIndex(item => item._id === id || item.id === id);
  if (index === -1) return false;
  data.splice(index, 1);
  cache[collection] = data;
  deleteFromMongo(collection, id);
  return true;
};
const count = (collection, filter = null) => findAll(collection, filter).length;

const Users = {
  findAll: (filter) => findAll('users', filter),
  findById: (id) => findById('users', id),
  findByEmail: (email) => findOne('users', { email: email.toLowerCase() }),
  create: (userData) => create('users', { ...userData, email: userData.email.toLowerCase() }),
  update: (id, updates) => updateById('users', id, updates),
  delete: (id) => deleteById('users', id),
  count: (filter) => count('users', filter),
  updateLastLogin: (id) => updateById('users', id, { lastLogin: new Date().toISOString() })
};
const Architects = {
  findAll: (filter) => findAll('architects', filter),
  findById: (id) => findById('architects', id),
  findByUserId: (userId) => findOne('architects', { userId }),
  findByOrderNumber: (orderNumber) => findOne('architects', { orderNumber }),
  create: (architectData) => create('architects', architectData),
  update: (id, updates) => updateById('architects', id, updates),
  delete: (id) => deleteById('architects', id),
  findVisible: () => findAll('architects', { profileVisible: true }),
  findAvailable: () => (cache.architects || []).filter(a => a.profileVisible && a.isAvailable)
};
const ActivationTokens = {
  findAll: () => findAll('activationTokens'),
  findByToken: (token) => findOne('activationTokens', { token: token.toUpperCase() }),
  create: (tokenData) => create('activationTokens', { ...tokenData, token: tokenData.token.toUpperCase() }),
  delete: (id) => deleteById('activationTokens', id),
  markAsUsed: (token, userId) => {
    const data = cache.activationTokens || [];
    const index = data.findIndex(t => t.token === token.toUpperCase());
    if (index !== -1) {
      data[index].used = true;
      data[index].usedBy = userId;
      data[index].usedAt = new Date().toISOString();
      cache.activationTokens = data;
      persistToMongo('activationTokens', data);
      return true;
    }
    return false;
  }
};
const Courses = {
  findAll: (filter) => findAll('courses', filter),
  findById: (id) => findById('courses', id),
  create: (courseData) => create('courses', courseData),
  update: (id, updates) => updateById('courses', id, updates),
  delete: (id) => deleteById('courses', id),
  findActive: () => (cache.courses || []).filter(c =>
    c.status !== 'cancelled' && new Date(c.date) >= new Date()
  ),
  decrementSeats: (id) => {
    const course = findById('courses', id);
    if (course && course.seatsAvailable > 0) {
      return updateById('courses', id, { seatsAvailable: course.seatsAvailable - 1 });
    }
    return null;
  }
};
const News = {
  findAll: (filter) => findAll('news', filter),
  findById: (id) => findById('news', id),
  create: (newsData) => create('news', newsData),
  update: (id, updates) => updateById('news', id, updates),
  delete: (id) => deleteById('news', id),
  findPublished: () => (cache.news || [])
    .filter(n => n.isPublished !== false)
    .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
};
const Messages = {
  findAll: (filter) => findAll('messages', filter),
  findById: (id) => findById('messages', id),
  create: (messageData) => create('messages', messageData),
  update: (id, updates) => updateById('messages', id, updates),
  delete: (id) => deleteById('messages', id),
  findByConversation: (conversationId) => (cache.messages || [])
    .filter(m => m.conversationId === conversationId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
  findByUser: (userId) => (cache.messages || [])
    .filter(m => m.senderId === userId || m.recipientId === userId)
};
const Conversations = {
  findAll: (filter) => findAll('conversations', filter),
  findById: (id) => findById('conversations', id),
  create: (convData) => create('conversations', convData),
  update: (id, updates) => updateById('conversations', id, updates),
  delete: (id) => deleteById('conversations', id),
  findByUser: (userId) => (cache.conversations || []).filter(c =>
    c.participants && c.participants.includes(userId)
  ),
  findOrCreateDirect: (userId1, userId2) => {
    const existing = (cache.conversations || []).find(c =>
      c.type === 'direct' && c.participants &&
      c.participants.includes(userId1) && c.participants.includes(userId2)
    );
    if (existing) return existing;
    return create('conversations', { type: 'direct', participants: [userId1, userId2] });
  }
};
const Enrollments = {
  findAll: (filter) => findAll('enrollments', filter),
  findById: (id) => findById('enrollments', id),
  create: (enrollmentData) => create('enrollments', enrollmentData),
  update: (id, updates) => updateById('enrollments', id, updates),
  delete: (id) => deleteById('enrollments', id),
  findByUser: (userId) => findAll('enrollments', { userId }),
  findByCourse: (courseId) => findAll('enrollments', { courseId }),
  isEnrolled: (userId, courseId) => findOne('enrollments', { userId, courseId }) !== null
};
const Notifications = {
  findAll: (filter) => findAll('notifications', filter),
  findById: (id) => findById('notifications', id),
  findByUserId: (userId) => findAll('notifications', { userId }),
  findUnreadByUserId: (userId) => findAll('notifications', { userId, read: false }),
  create: (data) => create('notifications', data),
  update: (id, updates) => updateById('notifications', id, updates),
  markAsRead: (id) => updateById('notifications', id, { read: true, readAt: new Date().toISOString() }),
  markAllAsRead: (userId) => {
    const data = cache.notifications || [];
    let updated = 0;
    data.forEach((n, i) => {
      if (n.userId === userId && !n.read) {
        data[i].read = true;
        data[i].readAt = new Date().toISOString();
        updated++;
      }
    });
    if (updated > 0) { cache.notifications = data; persistToMongo('notifications', data); }
    return updated;
  },
  delete: (id) => deleteById('notifications', id),
  countUnread: (userId) => findAll('notifications', { userId, read: false }).length
};

module.exports = {
  initialize,
  isInitialized,
  Users,
  Architects,
  ActivationTokens,
  Courses,
  News,
  Messages,
  Conversations,
  Enrollments,
  Notifications
};
