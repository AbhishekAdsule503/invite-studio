import ExcelJS from 'exceljs';
import prisma from '../database/prisma.js';
import subscriptionService from './subscription.service.js';
import { normalizePhone, phoneRegex } from '@smart-invitation/shared';

export class ExcelService {
  /**
   * Generates a downloadable Excel template for guest import
   * @returns {Promise<Buffer>}
   */
  async generateTemplate() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'INVITE STUDIO';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Guest Import Template', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    sheet.columns = [
      { header: 'Full Name *', key: 'fullName', width: 26 },
      { header: 'WhatsApp Number *', key: 'whatsappNumber', width: 22 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Address', key: 'address', width: 34 },
      { header: 'Relation', key: 'relation', width: 20 }
    ];

    // Style the header row
    const headerRow = sheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' } // slate-800
      };
      cell.font = {
        name: 'Segoe UI',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FF6366F1' } } // Indigo accent
      };
    });

    // Add sample example rows
    const sampleRows = [
      {
        fullName: 'Priya Sharma',
        whatsappNumber: '+919876543210',
        email: 'priya.sharma@example.com',
        address: 'Bandra West, Mumbai',
        relation: 'Family'
      },
      {
        fullName: 'Rahul Verma',
        whatsappNumber: '9876543211',
        email: '',
        address: 'Indiranagar, Bengaluru',
        relation: 'Friend'
      },
      {
        fullName: 'Anita Desai',
        whatsappNumber: '+919876543212',
        email: 'anita.d@example.com',
        address: 'Koregaon Park, Pune',
        relation: 'Colleague'
      }
    ];

    sampleRows.forEach((row) => {
      const addedRow = sheet.addRow(row);
      addedRow.height = 22;
      addedRow.eachCell((cell) => {
        cell.font = { name: 'Segoe UI', size: 10 };
        cell.alignment = { vertical: 'middle' };
      });
    });

    return workbook.xlsx.writeBuffer();
  }

  /**
   * Parses an uploaded Excel buffer, validates row data, checks duplicates, and returns a preview
   * @param {string} userId
   * @param {Buffer} fileBuffer
   */
  async parseAndPreviewImport(userId, fileBuffer) {
    // Enforce bulk import entitlement
    await subscriptionService.enforceLimit(userId, 'IMPORT_CONTACTS', { count: 0 });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);

    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) {
      const err = new Error('The uploaded Excel file appears to be empty or contains only headers.');
      err.statusCode = 400;
      throw err;
    }

    // Inspect header row to determine column mappings
    const headerRow = sheet.getRow(1);
    const colMap = {};

    headerRow.eachCell((cell, colNumber) => {
      const text = (cell.value || '').toString().toLowerCase().replace(/[^a-z]/g, '');
      if (text.includes('fullname') || text === 'name') colMap.fullName = colNumber;
      else if (text.includes('whatsapp') || text.includes('phone') || text.includes('mobile')) colMap.whatsappNumber = colNumber;
      else if (text.includes('email')) colMap.email = colNumber;
      else if (text.includes('address')) colMap.address = colNumber;
      else if (text.includes('relation')) colMap.relation = colNumber;
    });

    if (!colMap.fullName || !colMap.whatsappNumber) {
      const err = new Error('Missing required columns. The sheet must contain "Full Name" and "WhatsApp Number" headers.');
      err.statusCode = 400;
      throw err;
    }

    // Load existing user guest phone numbers to detect database duplicates
    const existingGuests = await prisma.guest.findMany({
      where: { userId },
      select: { whatsappNumber: true }
    });
    const existingPhones = new Set(existingGuests.map((g) => g.whatsappNumber));

    const seenInFile = new Set();
    const rows = [];
    let validCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    const maxRows = 1000;
    const rowLimit = Math.min(sheet.rowCount, maxRows + 1);

    for (let rowNumber = 2; rowNumber <= rowLimit; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      const rawName = row.getCell(colMap.fullName).value;
      const rawPhone = row.getCell(colMap.whatsappNumber).value;
      const rawEmail = colMap.email ? row.getCell(colMap.email).value : '';
      const rawAddress = colMap.address ? row.getCell(colMap.address).value : '';
      const rawRelation = colMap.relation ? row.getCell(colMap.relation).value : '';

      // Skip completely empty rows
      if (!rawName && !rawPhone && !rawEmail && !rawAddress && !rawRelation) {
        continue;
      }

      const fullName = (rawName ? String(rawName).trim() : '');
      const rawPhoneStr = rawPhone ? String(rawPhone).trim() : '';
      const email = rawEmail ? String(rawEmail).trim().toLowerCase() : '';
      const address = rawAddress ? String(rawAddress).trim() : '';
      const relation = rawRelation ? String(rawRelation).trim() : '';

      const errors = [];

      // Validate Name
      if (!fullName || fullName.length < 1) {
        errors.push('Full Name is required.');
      } else if (fullName.length > 100) {
        errors.push('Full Name must be under 100 characters.');
      }

      // Validate Phone
      let normalizedPhone = '';
      if (!rawPhoneStr) {
        errors.push('WhatsApp Number is required.');
      } else {
        normalizedPhone = normalizePhone(rawPhoneStr);
        if (!normalizedPhone || !phoneRegex.test(normalizedPhone)) {
          errors.push('Invalid phone format. Please provide a 10-digit number or international format.');
        }
      }

      // Validate Email if provided
      if (email && email.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errors.push('Invalid email address format.');
        }
      }

      let status = 'VALID';

      if (errors.length > 0) {
        status = 'INVALID';
        invalidCount++;
      } else if (seenInFile.has(normalizedPhone)) {
        status = 'DUPLICATE';
        errors.push('Duplicate entry found within this Excel file.');
        duplicateCount++;
      } else if (existingPhones.has(normalizedPhone)) {
        status = 'DUPLICATE';
        errors.push('Guest with this WhatsApp number already exists in your address book.');
        duplicateCount++;
      } else {
        validCount++;
        seenInFile.add(normalizedPhone);
      }

      rows.push({
        rowNumber,
        fullName,
        whatsappNumber: normalizedPhone || rawPhoneStr,
        email,
        address,
        relation,
        status,
        errors
      });
    }

    return {
      totalRows: rows.length,
      validCount,
      duplicateCount,
      invalidCount,
      rows
    };
  }

  /**
   * Confirms and persists previewed valid rows in a database transaction
   * @param {string} userId
   * @param {Array<{ fullName: string, whatsappNumber: string, email?: string, address?: string, relation?: string }>} rowsToImport
   */
  async confirmImport(userId, rowsToImport) {
    if (!Array.isArray(rowsToImport) || rowsToImport.length === 0) {
      const err = new Error('No valid guest records provided for import.');
      err.statusCode = 400;
      throw err;
    }

    // Enforce import entitlement and contact capacity
    await subscriptionService.enforceLimit(userId, 'IMPORT_CONTACTS', { count: rowsToImport.length });

    return prisma.$transaction(async (tx) => {
      let importedCount = 0;
      const seenPhones = new Set();

      for (const row of rowsToImport) {
        if (!row.fullName || !row.whatsappNumber) continue;
        const normalized = normalizePhone(row.whatsappNumber);
        if (!normalized || !phoneRegex.test(normalized)) continue;
        if (seenPhones.has(normalized)) continue;

        const exists = await tx.guest.findFirst({
          where: { userId, whatsappNumber: normalized }
        });

        if (!exists) {
          await tx.guest.create({
            data: {
              userId,
              fullName: row.fullName.trim(),
              whatsappNumber: normalized,
              email: row.email ? row.email.trim().toLowerCase() : null,
              address: row.address ? row.address.trim() : null,
              relation: row.relation ? row.relation.trim() : null,
              isPermanent: true
            }
          });
          seenPhones.add(normalized);
          importedCount++;
        }
      }

      return {
        success: true,
        importedCount,
        message: `Successfully imported ${importedCount} guest(s) into your address book.`
      };
    });
  }

  /**
   * Exports all permanent guests for a user into a styled Excel file
   * @param {string} userId
   * @returns {Promise<Buffer>}
   */
  async exportGuests(userId) {
    // Enforce export entitlement (Personal, Family, Family Plus)
    await subscriptionService.enforceLimit(userId, 'EXPORT_CONTACTS');

    const guests = await prisma.guest.findMany({
      where: { userId },
      orderBy: { fullName: 'asc' }
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'INVITE STUDIO';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('My Guests', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    sheet.columns = [
      { header: 'Full Name', key: 'fullName', width: 26 },
      { header: 'WhatsApp Number', key: 'whatsappNumber', width: 22 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Address', key: 'address', width: 34 },
      { header: 'Relation', key: 'relation', width: 20 },
      { header: 'Added On', key: 'createdAt', width: 16 }
    ];

    // Header styling
    const headerRow = sheet.getRow(1);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' }
      };
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    guests.forEach((guest) => {
      const row = sheet.addRow({
        fullName: guest.fullName,
        whatsappNumber: guest.whatsappNumber,
        email: guest.email || '',
        address: guest.address || '',
        relation: guest.relation || '',
        createdAt: guest.createdAt ? new Date(guest.createdAt).toLocaleDateString() : ''
      });
      row.height = 20;
      row.eachCell((cell) => {
        cell.font = { name: 'Segoe UI', size: 9 };
        cell.alignment = { vertical: 'middle' };
      });
    });

    return workbook.xlsx.writeBuffer();
  }
}

export const excelService = new ExcelService();
export default excelService;
