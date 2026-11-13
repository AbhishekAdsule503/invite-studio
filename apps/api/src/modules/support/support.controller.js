import prisma from '../../database/prisma.js';

export async function createTicket(req, res, next) {
  try {
    const { subject, message, category = 'GENERAL', priority = 'MEDIUM' } = req.body;

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: req.user.id,
        subject: subject.trim(),
        message: message.trim(),
        category,
        priority,
        status: 'OPEN'
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'SUPPORT_TICKET_CREATED',
        resourceType: 'SupportTicket',
        resourceId: ticket.id,
        metadata: JSON.stringify({ subject: ticket.subject, category: ticket.category })
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Support ticket submitted successfully. Our team will review it shortly.',
      ticket
    });
  } catch (error) {
    next(error);
  }
}

export async function listUserTickets(req, res, next) {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      success: true,
      tickets
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserTicket(req, res, next) {
  try {
    const { id } = req.params;
    const ticket = await prisma.supportTicket.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Support ticket not found.'
      });
    }

    return res.status(200).json({
      success: true,
      ticket
    });
  } catch (error) {
    next(error);
  }
}
