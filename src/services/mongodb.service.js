// backend/src/services/mongodb.service.js
// Implementazione MongoDB dello stesso API di data.service.js
// Usato automaticamente quando MONGODB_URI è configurato

const {
  UserModel, ArchitectModel, ActivationTokenModel, CourseModel,
  NewsModel, ConversationModel, MessageModel, EnrollmentModel, NotificationModel
} = require('../models');
const { generateId } = require('../utils/helpers');

// ─── HELPER GENERICI ────────────────────────────────────────────────────────

const toObj = (doc) => doc ? doc.toObject() : null;
const toArr = (docs) => docs.map(d => d.toObject());

const buildFilter = (filter = {}) => {
  // Costruisce un filtro MongoDB da un oggetto chiave/valore semplice
  return filter;
};

const makeCollection = (Model) => ({
  findAll: async (filter = {}) => {
    const docs = await Model.find(buildFilter(filter)).lean();
    return docs;
  },
  findById: async (id) => {
    const doc = await Model.findOne({ _id: id }).lean();
    return doc;
  },
  create: async (data) => {
    const newDoc = { ...data, _id: data._id || generateId() };
    await Model.create(newDoc);
    return newDoc;
  },
  update: async (id, updates) => {
    const updated = await Model.findOneAndUpdate(
      { _id: id },
      { $set: { ...updates, updatedAt: new Date().toISOString() } },
      { new: true, lean: true }
    );
    return updated;
  },
  delete: async (id) => {
    await Model.deleteOne({ _id: id });
    return true;
  },
  count: async (filter = {}) => {
    return await Model.countDocuments(buildFilter(filter));
  },
});

// ─── USERS ──────────────────────────────────────────────────────────────────
const Users = {
  ...makeCollection(UserModel),
  findByEmail: async (email) => {
    return await UserModel.findOne({ email: email.toLowerCase() }).lean();
  },
  findByResetToken: async (token) => {
    return await UserModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date().toISOString() }
    }).lean();
  },
};

// ─── ARCHITECTS ─────────────────────────────────────────────────────────────
const Architects = {
  ...makeCollection(ArchitectModel),
  findByUserId: async (userId) => {
    return await ArchitectModel.findOne({ userId }).lean();
  },
  findApproved: async () => {
    return await ArchitectModel.find({ isApproved: true }).lean();
  },
  search: async ({ query, city, specialization, available }) => {
    const filter = { isApproved: true };
    if (available) filter.isAvailable = true;
    if (city) filter.city = { $regex: city, $options: 'i' };
    if (specialization) filter.specializations = { $in: [specialization] };
    let docs = await ArchitectModel.find(filter).lean();
    if (query) {
      const q = query.toLowerCase();
      docs = docs.filter(a =>
        (a.firstName || '').toLowerCase().includes(q) ||
        (a.lastName || '').toLowerCase().includes(q) ||
        (a.bio || '').toLowerCase().includes(q)
      );
    }
    return docs;
  },
};

// ─── ACTIVATION TOKENS ──────────────────────────────────────────────────────
const ActivationTokens = {
  ...makeCollection(ActivationTokenModel),
  findByToken: async (token) => {
    return await ActivationTokenModel.findOne({ token }).lean();
  },
  findUnused: async () => {
    return await ActivationTokenModel.find({ isUsed: false }).lean();
  },
};

// ─── COURSES ────────────────────────────────────────────────────────────────
const Courses = {
  ...makeCollection(CourseModel),
  findUpcoming: async () => {
    return await CourseModel.find({
      status: { $in: ['scheduled', 'ongoing'] },
      date: { $gte: new Date().toISOString() }
    }).lean();
  },
};

// ─── NEWS ────────────────────────────────────────────────────────────────────
const News = {
  ...makeCollection(NewsModel),
  findPublished: async () => {
    return await NewsModel.find({ isPublished: true }).sort({ publishedAt: -1 }).lean();
  },
};

// ─── CONVERSATIONS ──────────────────────────────────────────────────────────
const Conversations = {
  ...makeCollection(ConversationModel),
  findByParticipant: async (userId) => {
    return await ConversationModel.find({ participants: userId }).lean();
  },
  findByParticipants: async (userId1, userId2) => {
    return await ConversationModel.findOne({
      participants: { $all: [userId1, userId2] }
    }).lean();
  },
};

// ─── MESSAGES ────────────────────────────────────────────────────────────────
const Messages = {
  ...makeCollection(MessageModel),
  findByConversation: async (conversationId) => {
    return await MessageModel.find({ conversationId }).sort({ createdAt: 1 }).lean();
  },
  markAsRead: async (conversationId, userId) => {
    await MessageModel.updateMany(
      { conversationId, senderId: { $ne: userId }, isRead: false },
      { $set: { isRead: true } }
    );
  },
};

// ─── ENROLLMENTS ────────────────────────────────────────────────────────────
const Enrollments = {
  ...makeCollection(EnrollmentModel),
  findByUser: async (userId) => {
    return await EnrollmentModel.find({ userId }).lean();
  },
  findByCourse: async (courseId) => {
    return await EnrollmentModel.find({ courseId }).lean();
  },
};

// ─── NOTIFICATIONS ──────────────────────────────────────────────────────────
const Notifications = {
  ...makeCollection(NotificationModel),
  findByUserId: async (userId) => {
    return await NotificationModel.find({ userId }).sort({ createdAt: -1 }).lean();
  },
  findUnreadByUserId: async (userId) => {
    return await NotificationModel.find({ userId, read: false }).lean();
  },
  markAsRead: async (id) => {
    return await NotificationModel.findOneAndUpdate(
      { _id: id },
      { $set: { read: true } },
      { new: true, lean: true }
    );
  },
  markAllAsRead: async (userId) => {
    await NotificationModel.updateMany({ userId, read: false }, { $set: { read: true } });
  },
  countUnread: async (userId) => {
    return await NotificationModel.countDocuments({ userId, read: false });
  },
};

module.exports = {
  Users, Architects, ActivationTokens, Courses, News,
  Conversations, Messages, Enrollments, Notifications,
};
