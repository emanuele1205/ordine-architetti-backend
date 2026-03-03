// src/controllers/messages.controller.js
// Controller per gestione messaggi e conversazioni

const { Messages, Conversations, Users, Architects } = require('../services/data.service');
const { HTTP_STATUS, USER_TYPES } = require('../utils/constants');

/**
 * GET /api/messages/conversations
 * Lista conversazioni dell'utente
 */
const getConversations = (req, res, next) => {
  try {
    const userId = req.user.id;

    // Carica conversazioni dell'utente
    const conversations = Conversations.findByUser(userId);

    // Arricchisci con dati partecipanti e ultimo messaggio
    const enrichedConversations = conversations.map(conv => {
      // Trova l'altro partecipante
      const otherParticipantId = conv.participants.find(p => p !== userId);
      const otherUser = Users.findById(otherParticipantId);
      
      // Trova architetto se applicabile
      let architectData = null;
      if (otherUser?.userType === USER_TYPES.ARCHITECT) {
        architectData = Architects.findByUserId(otherParticipantId);
      }

      // Trova ultimo messaggio
      const messages = Messages.findByConversation(conv._id);
      const lastMessage = messages[messages.length - 1];

      // Conta messaggi non letti
      const unreadCount = messages.filter(m => 
        m.senderId !== userId && !m.readAt
      ).length;

      return {
        ...conv,
        participant: otherUser ? {
          id: otherUser._id,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          userType: otherUser.userType,
          isArchitect: otherUser.userType === USER_TYPES.ARCHITECT,
          architect: architectData
        } : null,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          createdAt: lastMessage.createdAt,
          isOwn: lastMessage.senderId === userId
        } : null,
        unreadCount
      };
    });

    // Ordina per ultimo messaggio
    enrichedConversations.sort((a, b) => {
      const dateA = a.lastMessage?.createdAt || a.createdAt;
      const dateB = b.lastMessage?.createdAt || b.createdAt;
      return new Date(dateB) - new Date(dateA);
    });

    res.json({
      success: true,
      conversations: enrichedConversations
    });

  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/messages/conversations/:id
 * Messaggi di una conversazione
 */
const getConversationMessages = (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verifica che la conversazione esista e l'utente ne faccia parte
    const conversation = Conversations.findById(id);
    if (!conversation) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Conversazione non trovata'
      });
    }

    if (!conversation.participants.includes(userId)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Non fai parte di questa conversazione'
      });
    }

    // Carica messaggi
    const messages = Messages.findByConversation(id);

    // Marca come letti i messaggi ricevuti
    messages.forEach(msg => {
      if (msg.senderId !== userId && !msg.readAt) {
        Messages.update(msg._id, { readAt: new Date().toISOString() });
      }
    });

    // Arricchisci con info mittente
    const enrichedMessages = messages.map(msg => {
      const sender = Users.findById(msg.senderId);
      return {
        ...msg,
        sender: sender ? {
          id: sender._id,
          firstName: sender.firstName,
          lastName: sender.lastName
        } : null,
        isOwn: msg.senderId === userId
      };
    });

    res.json({
      success: true,
      conversation,
      messages: enrichedMessages
    });

  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/messages/conversations
 * Crea nuova conversazione o ottieni esistente
 */
const createConversation = (req, res, next) => {
  try {
    const { recipientId } = req.body;
    const userId = req.user.id;

    if (!recipientId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'ID destinatario richiesto'
      });
    }

    if (recipientId === userId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Non puoi creare una conversazione con te stesso'
      });
    }

    // Verifica che il destinatario esista
    const recipient = Users.findById(recipientId);
    if (!recipient) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Destinatario non trovato'
      });
    }

    // Se il destinatario è un architetto, verifica che accetti messaggi
    if (recipient.userType === USER_TYPES.ARCHITECT) {
      const architect = Architects.findByUserId(recipientId);
      if (architect && !architect.acceptMessages) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: 'MESSAGES_DISABLED',
          message: 'Questo architetto non accetta messaggi'
        });
      }
    }

    // Trova o crea conversazione
    const conversation = Conversations.findOrCreateDirect(userId, recipientId);

    res.json({
      success: true,
      conversation,
      isNew: !conversation.updatedAt || conversation.updatedAt === conversation.createdAt
    });

  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/messages/conversations/:id/messages
 * Invia messaggio in una conversazione
 */
const sendMessage = (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Contenuto messaggio richiesto'
      });
    }

    // Verifica conversazione
    const conversation = Conversations.findById(id);
    if (!conversation) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Conversazione non trovata'
      });
    }

    if (!conversation.participants.includes(userId)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Non fai parte di questa conversazione'
      });
    }

    // Crea messaggio
    const message = Messages.create({
      conversationId: id,
      senderId: userId,
      content: content.trim(),
      readAt: null
    });

    // Aggiorna timestamp conversazione
    Conversations.update(id, {});

    // Arricchisci con info mittente
    const sender = Users.findById(userId);
    const enrichedMessage = {
      ...message,
      sender: {
        id: sender._id,
        firstName: sender.firstName,
        lastName: sender.lastName
      },
      isOwn: true
    };

    console.log('✅ Messaggio inviato:', { from: userId, conversation: id });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: enrichedMessage
    });

  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/messages/unread-count
 * Conta messaggi non letti
 */
const getUnreadCount = (req, res, next) => {
  try {
    const userId = req.user.id;

    // Carica tutte le conversazioni dell'utente
    const conversations = Conversations.findByUser(userId);
    
    let totalUnread = 0;
    
    conversations.forEach(conv => {
      const messages = Messages.findByConversation(conv._id);
      const unread = messages.filter(m => 
        m.senderId !== userId && !m.readAt
      ).length;
      totalUnread += unread;
    });

    res.json({
      success: true,
      unreadCount: totalUnread
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConversations,
  getConversationMessages,
  createConversation,
  sendMessage,
  getUnreadCount
};