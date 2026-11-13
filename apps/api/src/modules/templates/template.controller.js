import templateService from '../../services/template.service.js';

export async function listTemplates(req, res, next) {
  try {
    const { eventType } = req.query;
    const templates = await templateService.listTemplates(req.user.id, { eventType });
    return res.status(200).json({
      success: true,
      templates
    });
  } catch (error) {
    next(error);
  }
}

export async function getTemplate(req, res, next) {
  try {
    const template = await templateService.getTemplateById(req.user.id, req.params.id);
    return res.status(200).json({
      success: true,
      template
    });
  } catch (error) {
    next(error);
  }
}

export async function createTemplate(req, res, next) {
  try {
    const data = {
      ...req.body
    };

    // If an image file was uploaded via multer, use it as previewImageUrl
    if (req.file && req.file.filename) {
      data.previewImageUrl = `/uploads/${req.file.filename}`;
    }

    const template = await templateService.createCustomTemplate(req.user.id, data);
    return res.status(201).json({
      success: true,
      template,
      message: 'Custom invitation template created successfully.'
    });
  } catch (error) {
    next(error);
  }
}
