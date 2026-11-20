import reminderService from '../../services/reminder.service.js';

export async function getUpcomingReminders(req, res, next) {
  try {
    const { daysAhead } = req.query;
    const result = await reminderService.getUpcomingReminders(req.tenantId || req.user.id, { daysAhead });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getReminderSettings(req, res, next) {
  try {
    const settings = await reminderService.getSettings(req.user.id);
    return res.status(200).json({ success: true, settings });
  } catch (error) {
    next(error);
  }
}
