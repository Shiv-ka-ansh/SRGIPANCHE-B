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

// GET /api/export/event-participants?format=excel|csv
router.get('/event-participants', verifyToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const format = req.query.format || 'excel';

    // 1. Fetch all registrations with student info populated
    const registrations = await EventRegistration.find({})
      .populate('studentId', 'fullName rollNo branch mobileNo email course year section')
      .populate('processedBy', 'name')
      .lean();

    // 2. Build a map: eventName -> list of participants
    const eventMap: Record<string, any> = {};

    for (const reg of registrations) {
      const student: any = reg.studentId || {};
      for (const ev of (reg.events || [])) {
        const key = ev.eventName;
        if (!eventMap[key]) {
          eventMap[key] = {
            eventName: ev.eventName,
            category: ev.category || 'General',
            amount: ev.amount || 0,
            participants: [],
          };
        }
        eventMap[key].participants.push({
          name: student.fullName || reg.studentName || 'N/A',
          rollNo: student.rollNo || reg.rollNo || 'N/A',
          branch: student.branch || 'N/A',
          year: student.year || 'N/A',
          mobile: student.mobileNo || 'N/A',
          email: student.email || 'N/A',
          type: reg.isGroup ? 'GROUP' : 'SINGLE',
          registeredAt: reg.processedAt ? new Date(reg.processedAt).toLocaleDateString('en-IN') : 'N/A',
          subEvent: ev.subEvent || '-',
        });
      }
    }

    // 3. Sort events by category order
    const categoryOrder = ['General', 'Technical', 'Cultural', 'Cyber'];
    const sortedEvents = Object.values(eventMap).sort((a: any, b: any) => {
      const ai = categoryOrder.indexOf(a.category);
      const bi = categoryOrder.indexOf(b.category);
      if (ai !== bi) return ai - bi;
      return a.eventName.localeCompare(b.eventName);
    });

    // ── EXCEL FORMAT ──
    if (format === 'excel') {
      const workbook = new exceljs.Workbook();
      workbook.creator = 'Panache Admin';
      const sheet = workbook.addWorksheet('Participants by Event');

      // Styles
      const eventHeaderStyle = {
        font: { bold: true, size: 13, color: { argb: 'FF050505' } },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFCCFF00' } },
        alignment: { vertical: 'middle', horizontal: 'left' } as const,
      };
      const columnHeaderStyle = {
        font: { bold: true, size: 10, color: { argb: 'FFCCFF00' } },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF121212' } },
        alignment: { vertical: 'middle', horizontal: 'left' } as const,
      };
      const rowStyle = {
        font: { size: 10, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1A1A1A' } },
      };

      // Set column widths
      sheet.columns = [
        { key: 'sno',  width: 5  },
        { key: 'name', width: 28 },
        { key: 'roll', width: 18 },
        { key: 'branch', width: 12 },
        { key: 'year', width: 8 },
        { key: 'mobile', width: 14 },
        { key: 'email', width: 28 },
        { key: 'type', width: 10 },
        { key: 'subEvent', width: 16 },
        { key: 'date', width: 14 },
      ];

      for (const ev of sortedEvents) {
        // Event Header Row (merged across all columns)
        const headerRow = sheet.addRow([
          `${ev.eventName}   [${ev.category}]   ₹${ev.amount}   —   ${ev.participants.length} registered`
        ]);
        sheet.mergeCells(`A${headerRow.number}:K${headerRow.number}`);
        headerRow.height = 22;
        headerRow.getCell(1).style = eventHeaderStyle;

        // Column Headers
        const colRow = sheet.addRow(['#', 'Name', 'Roll No', 'Branch', 'Year', 'Mobile', 'Email', 'Type', 'Sub Event', 'Date']);
        colRow.height = 18;
        colRow.eachCell(cell => { cell.style = columnHeaderStyle; });

        // Participant Rows
        if (ev.participants.length === 0) {
          const emptyRow = sheet.addRow(['-', 'No registrations yet', '', '', '', '', '', '', '', '', '']);
          emptyRow.getCell(2).font = { italic: true, color: { argb: 'FF666666' } };
        } else {
          ev.participants.forEach((p: any, i: number) => {
            const row = sheet.addRow([
              i + 1,
              p.name,
              p.rollNo,
              p.branch,
              p.year,
              p.mobile,
              p.email,
              p.type,
              p.subEvent,
              p.registeredAt,
            ]);
            row.eachCell(cell => {
              cell.style = rowStyle;
              cell.border = { bottom: { style: 'thin', color: { argb: 'FF333333' } } };
            });
          });
        }

        // Blank separator row between events
        sheet.addRow([]);
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=panache-event-participants.xlsx');
      await workbook.xlsx.write(res);
      return res.end();
    }

    // ── CSV FORMAT ──
    if (format === 'csv') {
      const lines = [];
      for (const ev of sortedEvents) {
        lines.push(`\n"EVENT: ${ev.eventName}","Category: ${ev.category}","Amount: Rs${ev.amount}","Registered: ${ev.participants.length}"`);
        lines.push('"#","Name","Roll No","Branch","Year","Mobile","Email","Type","Sub Event","Date"');
        if (ev.participants.length === 0) {
          lines.push('"-","No registrations yet"');
        } else {
          ev.participants.forEach((p: any, i: number) => {
            lines.push([
              i + 1,
              `"${p.name}"`,
              `"${p.rollNo}"`,
              `"${p.branch}"`,
              `"${p.year}"`,
              `"${p.mobile}"`,
              `"${p.email}"`,
              p.type,
              `"${p.subEvent}"`,
              `"${p.registeredAt}"`,
            ].join(','));
          });
        }
      }
      const csv = lines.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=panache-event-participants.csv');
      return res.send(csv);
    }

    res.status(400).json({ error: 'Invalid format. Use excel or csv.' });

  } catch (err: any) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Export failed' });
  }
});

export default router;
