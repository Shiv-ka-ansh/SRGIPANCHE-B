import { Router } from 'express';
import { Parser } from 'json2csv';
import exceljs from 'exceljs';
import EventRegistration from '../models/EventRegistration';
import { verifyToken, requireSuperAdmin } from '../middleware/auth';

const router = Router();

/**
 * Build a MongoDB filter from export query params.
 * Supported params: category, subEvent, regType, adminName
 */
function buildExportFilter(query: any) {
  const filter: any = {};

  if (query.category) {
    filter['events.category'] = { $regex: new RegExp(`^${query.category}$`, 'i') };
  }

  if (query.subEvent) {
    filter['events.subEvent'] = { $regex: new RegExp(`^${query.subEvent}$`, 'i') };
  }

  if (query.regType) {
    if (query.regType === 'single') filter.isGroup = false;
    if (query.regType === 'group') filter.isGroup = true;
  }

  return filter;
}

// GET /api/export/csv
router.get('/csv', verifyToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const filter = buildExportFilter(req.query);
    let registrations = await EventRegistration.find(filter)
      .populate('processedBy', 'name')
      .sort({ processedAt: 1 })
      .lean();

    // Post-query filter for adminName (populated field)
    if (req.query.adminName) {
      registrations = registrations.filter((r: any) =>
        r.processedBy?.name?.toLowerCase() === (req.query.adminName as string).toLowerCase()
      );
    }

    const data = registrations.map((r: any, index: number) => {
      const eventsStr = r.events.map((e: any) => e.eventName).join(', ');
      const categoriesStr = [...new Set(r.events.map((e: any) => e.category))].join(', ');
      return {
        Sr: index + 1,
        'Student Name': r.studentName,
        'Roll No': r.rollNo,
        Type: r.isGroup ? 'Group' : 'Single',
        'Group Members': r.isGroup && r.groupMembers ? r.groupMembers.join(', ') : '',
        Categories: categoriesStr,
        Events: eventsStr,
        'Total Amount': r.totalAmount,
        'Processed By': r.processedBy?.name || 'N/A',
        Date: r.processedAt ? new Date(r.processedAt).toISOString().split('T')[0] : '',
      };
    });

    // No total row appended (noTotal is always true from frontend)

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment('panache-registrations.csv');
    return res.send(csv);
  } catch (error) {
    next(error);
  }
});

// GET /api/export/excel
router.get('/excel', verifyToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const filter = buildExportFilter(req.query);
    let registrations = await EventRegistration.find(filter)
      .populate('processedBy', 'name')
      .sort({ processedAt: 1 })
      .lean();

    // Post-query filter for adminName (populated field)
    if (req.query.adminName) {
      registrations = registrations.filter((r: any) =>
        r.processedBy?.name?.toLowerCase() === (req.query.adminName as string).toLowerCase()
      );
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Registrations');

    worksheet.columns = [
      { header: 'Sr', key: 'sr', width: 5 },
      { header: 'Student Name', key: 'name', width: 20 },
      { header: 'Roll No', key: 'rollNo', width: 15 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Group Members', key: 'groupMembers', width: 30 },
      { header: 'Categories', key: 'categories', width: 15 },
      { header: 'Events', key: 'events', width: 30 },
      { header: 'Total Amount', key: 'amount', width: 15 },
      { header: 'Processed By', key: 'processedBy', width: 15 },
      { header: 'Date', key: 'date', width: 15 },
    ];

    // Styling headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFF00' } };

    registrations.forEach((r: any, index: number) => {
      const eventsStr = r.events.map((e: any) => e.eventName).join(', ');
      const categoriesStr = [...new Set(r.events.map((e: any) => e.category))].join(', ');

      const row = worksheet.addRow({
        sr: index + 1,
        name: r.studentName,
        rollNo: r.rollNo,
        type: r.isGroup ? 'Group' : 'Single',
        groupMembers: r.isGroup && r.groupMembers ? r.groupMembers.join(', ') : '',
        categories: categoriesStr,
        events: eventsStr,
        amount: r.totalAmount,
        processedBy: r.processedBy?.name || 'N/A',
        date: r.processedAt ? new Date(r.processedAt).toISOString().split('T')[0] : '',
      });

      // Alternating row colors
      if (index % 2 === 1) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      }
    });

    // No total row appended (noTotal is always true from frontend)

    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment('panache-registrations.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
});

export default router;
