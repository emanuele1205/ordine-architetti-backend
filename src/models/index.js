// backend/src/models/index.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── USER ───────────────────────────────────────────────────────────────────
const UserSchema = new Schema({
  _id: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  firstName: String,
  lastName: String,
  phone: String,
  userType: { type: String, enum: ['guest', 'registered', 'architect', 'admin'], default: 'registered' },
  isActive: { type: Boolean, default: true },
  photoUrl: String,
  settings: { type: Schema.Types.Mixed, default: {} },
  passwordResetToken: String,
  passwordResetExpires: String,
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
}, { _id: false });

// ─── ARCHITECT ───────────────────────────────────────────────────────────────
const ArchitectSchema = new Schema({
  _id: { type: String, required: true },
  userId: { type: String, required: true },
  orderNumber: String,
  specializations: [String],
  bio: String,
  city: String,
  province: String,
  website: String,
  rating: Number,
  reviewCount: Number,
  projectCount: Number,
  isAvailable: { type: Boolean, default: true },
  isApproved: { type: Boolean, default: false },
  photoUrl: String,
  certifications: [Schema.Types.Mixed],
  portfolio: [Schema.Types.Mixed],
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
}, { _id: false });

// ─── ACTIVATION TOKEN ─────────────────────────────────────────────────────
const ActivationTokenSchema = new Schema({
  _id: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  orderNumber: String,
  isUsed: { type: Boolean, default: false },
  usedBy: String,
  usedAt: String,
  expiresAt: String,
  createdAt: { type: String, default: () => new Date().toISOString() },
}, { _id: false });

// ─── COURSE ──────────────────────────────────────────────────────────────────
const CourseSchema = new Schema({
  _id: { type: String, required: true },
  title: String,
  description: String,
  date: String,
  endDate: String,
  location: String,
  isOnline: { type: Boolean, default: false },
  cfpCredits: Number,
  maxParticipants: Number,
  enrolledCount: { type: Number, default: 0 },
  price: Number,
  isFree: { type: Boolean, default: false },
  status: { type: String, enum: ['scheduled', 'ongoing', 'completed', 'cancelled'], default: 'scheduled' },
  instructor: String,
  category: String,
  imageUrl: String,
  createdAt: { type: String, default: () => new Date().toISOString() },
}, { _id: false });

// ─── NEWS ────────────────────────────────────────────────────────────────────
const NewsSchema = new Schema({
  _id: { type: String, required: true },
  title: String,
  content: String,
  excerpt: String,
  category: String,
  imageUrl: String,
  authorId: String,
  isPublished: { type: Boolean, default: false },
  publishedAt: String,
  tags: [String],
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
}, { _id: false });

// ─── CONVERSATION ────────────────────────────────────────────────────────────
const ConversationSchema = new Schema({
  _id: { type: String, required: true },
  participants: [String],
  lastMessage: String,
  lastMessageAt: String,
  unreadCount: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
}, { _id: false });

// ─── MESSAGE ─────────────────────────────────────────────────────────────────
const MessageSchema = new Schema({
  _id: { type: String, required: true },
  conversationId: String,
  senderId: String,
  content: String,
  isRead: { type: Boolean, default: false },
  createdAt: { type: String, default: () => new Date().toISOString() },
}, { _id: false });

// ─── ENROLLMENT ──────────────────────────────────────────────────────────────
const EnrollmentSchema = new Schema({
  _id: { type: String, required: true },
  userId: String,
  courseId: String,
  status: { type: String, enum: ['enrolled', 'attended', 'cancelled'], default: 'enrolled' },
  paymentStatus: String,
  enrolledAt: { type: String, default: () => new Date().toISOString() },
  createdAt: { type: String, default: () => new Date().toISOString() },
}, { _id: false });

// ─── NOTIFICATION ────────────────────────────────────────────────────────────
const NotificationSchema = new Schema({
  _id: { type: String, required: true },
  userId: String,
  type: String,
  title: String,
  message: String,
  read: { type: Boolean, default: false },
  data: Schema.Types.Mixed,
  createdAt: { type: String, default: () => new Date().toISOString() },
}, { _id: false });

module.exports = {
  UserModel: mongoose.model('User', UserSchema, 'users'),
  ArchitectModel: mongoose.model('Architect', ArchitectSchema, 'architects'),
  ActivationTokenModel: mongoose.model('ActivationToken', ActivationTokenSchema, 'activationTokens'),
  CourseModel: mongoose.model('Course', CourseSchema, 'courses'),
  NewsModel: mongoose.model('News', NewsSchema, 'news'),
  ConversationModel: mongoose.model('Conversation', ConversationSchema, 'conversations'),
  MessageModel: mongoose.model('Message', MessageSchema, 'messages'),
  EnrollmentModel: mongoose.model('Enrollment', EnrollmentSchema, 'enrollments'),
  NotificationModel: mongoose.model('Notification', NotificationSchema, 'notifications'),
};
