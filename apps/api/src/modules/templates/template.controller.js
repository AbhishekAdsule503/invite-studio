import templateService from '../../services/template.service.js';
import storageService from '../../services/storage.service.js';

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

export async function uploadTemplateImage(req, res, next) {
  try {
    if (!req.file) {
      const err = new Error('Please select an image file to upload.');
      err.statusCode = 400;
      throw err;
    }

    const uploadResult = await storageService.uploadFile(req.file, {
      folder: 'templates',
      userId: req.user.id
    });

    const imageUrl = uploadResult.url;

    // If caller also provided full template creation fields, persist template as convenience
    let createdTemplate = null;
    if (req.body?.title && typeof req.body.title === 'string' && req.body.title.trim()) {
      const data = {
        ...req.body,
        previewImageUrl: imageUrl
      };
      createdTemplate = await templateService.createCustomTemplate(req.user.id, data);
    }

    return res.status(200).json({
      success: true,
      imageUrl,
      previewImageUrl: imageUrl,
      provider: uploadResult.provider,
      template: createdTemplate || {
        previewImageUrl: imageUrl
      },
      message: 'Image uploaded successfully.'
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

    // If an image file was uploaded via multer, upload to storage service
    if (req.file) {
      const uploadResult = await storageService.uploadFile(req.file, {
        folder: 'templates',
        userId: req.user.id
      });
      data.previewImageUrl = uploadResult.url;
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
