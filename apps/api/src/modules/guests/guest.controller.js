import guestService from '../../services/guest.service.js';
import excelService from '../../services/excel.service.js';

export async function listGuests(req, res, next) {
  try {
    const { search, relation, page, limit, sortBy, sortOrder } = req.query;
    const result = await guestService.listGuests(req.user.id, {
      search,
      relation,
      page,
      limit,
      sortBy,
      sortOrder
    });
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
}

export async function getGuest(req, res, next) {
  try {
    const guest = await guestService.getGuestById(req.user.id, req.params.id);
    return res.status(200).json({
      success: true,
      guest
    });
  } catch (error) {
    next(error);
  }
}

export async function createGuest(req, res, next) {
  try {
    const guest = await guestService.createGuest(req.user.id, req.body);
    return res.status(201).json({
      success: true,
      guest,
      message: 'Guest added successfully to address book.'
    });
  } catch (error) {
    next(error);
  }
}

export async function updateGuest(req, res, next) {
  try {
    const guest = await guestService.updateGuest(req.user.id, req.params.id, req.body);
    return res.status(200).json({
      success: true,
      guest,
      message: 'Guest updated successfully.'
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteGuest(req, res, next) {
  try {
    const result = await guestService.deleteGuest(req.user.id, req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function bulkDeleteGuests(req, res, next) {
  try {
    const { guestIds } = req.body;
    const result = await guestService.bulkDeleteGuests(req.user.id, guestIds);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function downloadTemplate(_req, res, next) {
  try {
    const buffer = await excelService.generateTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="invite_studio_guest_template.xlsx"');
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
}

export async function previewImport(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        error: 'Please upload an Excel (.xlsx) file to preview.'
      });
    }

    const preview = await excelService.parseAndPreviewImport(req.user.id, req.file.buffer);
    return res.status(200).json({
      success: true,
      ...preview
    });
  } catch (error) {
    next(error);
  }
}

export async function confirmImport(req, res, next) {
  try {
    const { rows } = req.body;
    const result = await excelService.confirmImport(req.user.id, rows);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function exportGuests(req, res, next) {
  try {
    const buffer = await excelService.exportGuests(req.user.id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="my_guests_${Date.now()}.xlsx"`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
}
