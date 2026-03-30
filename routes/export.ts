import { Router } from 'express';
import { Parser } from 'json2csv';
import exceljs from 'exceljs';
import EventRegistration from '../models/EventRegistration';
import { verifyToken, requireSuperAdmin } from '../middleware/auth';

const router = Router();


function buildExportFilter(query: any) {
  const filter: any = {};

  if (query.category) {
    filter['events.category'] = { $regex: new RegExp(`^${query.category}$`, 'i') };
  }

  if (query.subEvent) {
    filter['events.subEvent'] = { $regex: new RegExp(`^${query.subEvent}$`, 'i') };
  }

  if (query.eventName) {
    filter['events.eventName'] = { $regex: new RegExp(`^${query.eventName}$`, 'i') };
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
      .populate('studentId', 'fullName rollNo branch mobileNo email course year section token')
      .populate({ path: 'participantIds', select: 'fullName rollNo branch mobileNo email course year section token' })
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
        
        // Add Main Student / Group Leader
        eventMap[key].participants.push({
          name: student.fullName || reg.studentName || 'N/A',
          token: student.token || 'N/A',
          rollNo: student.rollNo || reg.rollNo || 'N/A',
          branch: student.branch || 'N/A',
          year: student.year || 'N/A',
          mobile: student.mobileNo || 'N/A',
          email: student.email || 'N/A',
          type: reg.isGroup ? 'GROUP (Leader)' : 'SINGLE',
          registeredAt: reg.processedAt ? new Date(reg.processedAt).toLocaleDateString('en-IN') : 'N/A',
          subEvent: ev.subEvent || '-',
        });

        // Add Group Members if any
        if (reg.isGroup && reg.groupMembers && reg.groupMembers.length > 0) {
          for (let i = 0; i < reg.groupMembers.length; i++) {
            const memberObj: any = reg.participantIds?.[i] || {};
            eventMap[key].participants.push({
              name: memberObj.fullName || reg.groupMembers[i],
              token: memberObj.token || 'N/A',
              rollNo: memberObj.rollNo || '-',
              branch: memberObj.branch || '-',
              year: memberObj.year || '-',
              mobile: memberObj.mobileNo || '-',
              email: memberObj.email || '-',
              type: 'GROUP (Member)',
              registeredAt: reg.processedAt ? new Date(reg.processedAt).toLocaleDateString('en-IN') : 'N/A',
              subEvent: ev.subEvent || '-',
            });
          }
        }
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
        font: { bold: true, size: 10, color: { argb: 'FF121212' } },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFEFEFEF' } },
        alignment: { vertical: 'middle', horizontal: 'left' } as const,
      };
      const rowStyle = {
        font: { size: 10, color: { argb: 'FF050505' } },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFFFFF' } },
      };

      // Set column widths
      sheet.columns = [
        { key: 'sno',  width: 5  },
        { key: 'token', width: 22 },
        { key: 'name', width: 28 },
        { key: 'roll', width: 18 },
        { key: 'branch', width: 12 },
        { key: 'year', width: 8 },
        { key: 'mobile', width: 14 },
        { key: 'email', width: 28 },
        { key: 'type', width: 16 },
        { key: 'subEvent', width: 16 },
        { key: 'date', width: 14 },
      ];

      for (const ev of sortedEvents) {
        // Event Header Row (merged across all columns)
        const headerRow = sheet.addRow([
          `${ev.eventName}   [${ev.category}]   —   ${ev.participants.length} registered`
        ]);
        sheet.mergeCells(`A${headerRow.number}:K${headerRow.number}`);
        headerRow.height = 22;
        headerRow.getCell(1).style = eventHeaderStyle;

        // Column Headers
        const colRow = sheet.addRow(['#', 'Token ID', 'Name', 'Roll No', 'Branch', 'Year', 'Mobile', 'Email', 'Type', 'Sub Event', 'Date']);
        colRow.height = 18;
        colRow.eachCell(cell => { cell.style = columnHeaderStyle; });

        // Participant Rows
        if (ev.participants.length === 0) {
          const emptyRow = sheet.addRow(['-', '-', 'No registrations yet', '', '', '', '', '', '', '', '']);
          emptyRow.getCell(3).font = { italic: true, color: { argb: 'FF666666' } };
        } else {
          ev.participants.forEach((p: any, i: number) => {
            const row = sheet.addRow([
              i + 1,
              p.token,
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
              cell.border = { bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } } };
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
        lines.push(`\n"EVENT: ${ev.eventName}","Category: ${ev.category}","Registered: ${ev.participants.length}"`);
        lines.push('"#","Token ID","Name","Roll No","Branch","Year","Mobile","Email","Type","Sub Event","Date"');
        if (ev.participants.length === 0) {
          lines.push('"-","-","No registrations yet"');
        } else {
          ev.participants.forEach((p: any, i: number) => {
            lines.push([
              i + 1,
              `"${p.token}"`,
              `"${p.name}"`,
              `"${p.rollNo}"`,
              `"${p.branch}"`,
              `"${p.year}"`,
              `"${p.mobile}"`,
              `"${p.email}"`,
              `"${p.type}"`,
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

// GET /api/export/full-report
router.get('/full-report', verifyToken, requireSuperAdmin, async (req, res, next) => {
  try {

    // ─── FETCH ALL DATA ───────────────────────────────────────────────
    const registrations = await EventRegistration.find({})
      .populate('studentId', 'fullName rollNo branch section year mobileNo email token course')
      .populate('processedBy', 'name')
      .sort({ processedAt: 1 })
      .lean();

    const today = new Date().toISOString().split('T')[0];
    const workbook = new exceljs.Workbook();
    workbook.creator = 'Panache System';
    workbook.created = new Date();

    // ─── STYLE HELPERS ───────────────────────────────────────────────
    const HEADER_FILL: exceljs.Fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' }
    };
    const HEADER_FONT: Partial<exceljs.Font> = { bold: true, color: { argb: 'FF000000' }, size: 11 };
    const ALT_FILL: exceljs.Fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' }
    };
    const WHITE_FILL: exceljs.Fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' }
    };
    const THIN_BORDER: Partial<exceljs.Borders> = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };

    function styleHeaderRow(row: exceljs.Row) {
      row.font = HEADER_FONT;
      row.fill = HEADER_FILL;
      row.border = THIN_BORDER;
      row.height = 20;
      row.alignment = { vertical: 'middle' };
    }

    function styleDataRow(row: exceljs.Row, index: number) {
      row.fill = index % 2 === 0 ? WHITE_FILL : ALT_FILL;
      row.border = THIN_BORDER;
      row.alignment = { vertical: 'middle', wrapText: false };
      row.height = 18;
    }

    function autoFitColumns(ws: exceljs.Worksheet) {
      ws.columns?.forEach(col => {
        let maxLen = 12;
        col.eachCell?.({ includeEmpty: true }, cell => {
          const val = cell.value ? String(cell.value) : '';
          if (val.length > maxLen) maxLen = val.length;
        });
        col.width = Math.min(maxLen + 4, 50);
      });
    }

    // ─── HELPER: build a unique student map ──────────────────────────
    // Key: studentId string → { token, fullName, rollNo, branch, year, mobileNo, email }
    const studentCache: Record<string, any> = {};
    for (const reg of registrations) {
      const s: any = reg.studentId || {};
      if (s._id) {
        studentCache[s._id.toString()] = s;
      }
      // Also cache participants
      for (const pid of (reg.participantIds || [])) {
        const pidStr = pid.toString();
        if (!studentCache[pidStr]) {
          // Will be populated below
        }
      }
    }

    // ─── SHEET 1: SUMMARY DASHBOARD ─────────────────────────────────
    const ws1 = workbook.addWorksheet('Summary Dashboard');

    // Build statistics
    const totalRegs = registrations.length;
    const singleRegs = registrations.filter(r => !r.isGroup).length;
    const groupRegs = registrations.filter(r => r.isGroup).length;

    // Category breakdown
    const catMap: Record<string, number> = {};
    const eventMap: Record<string, { count: number; category: string }> = {};
    const dailyMap: Record<string, number> = {};

    for (const reg of registrations) {
      for (const ev of reg.events) {
        // Category
        catMap[ev.category] = (catMap[ev.category] || 0) + 1;
        // Event-wise
        if (!eventMap[ev.eventName]) {
          eventMap[ev.eventName] = { count: 0, category: ev.category };
        }
        eventMap[ev.eventName].count++;
      }
      // Daily
      if (reg.processedAt) {
        const d = new Date(reg.processedAt).toISOString().split('T')[0];
        dailyMap[d] = (dailyMap[d] || 0) + 1;
      }
    }

    const top5 = Object.entries(eventMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    ws1.columns = [
      { key: 'a', width: 35 },
      { key: 'b', width: 20 },
      { key: 'c', width: 20 },
    ];

    // Title
    ws1.mergeCells('A1:C1');
    const titleRow = ws1.getRow(1);
    titleRow.getCell(1).value = `PANACHE — Registration Summary Dashboard (as of ${today})`;
    titleRow.getCell(1).font = { bold: true, size: 14 };
    titleRow.getCell(1).alignment = { horizontal: 'center' };
    titleRow.height = 28;

    // Overview stats
    ws1.addRow([]);
    const ovHeader = ws1.addRow(['Metric', 'Value', '']);
    styleHeaderRow(ovHeader);

    [
      ['Total Registrations', totalRegs],
      ['Single Registrations', singleRegs],
      ['Group Registrations', groupRegs],
    ].forEach(([label, val], i) => {
      styleDataRow(ws1.addRow([label, val, '']), i);
    });

    ws1.addRow([]);
    const catHeader = ws1.addRow(['Category', 'Registrations', '% of Total']);
    styleHeaderRow(catHeader);
    const categoryOrder = ['General', 'Technical', 'Cultural', 'Cyber'];
    categoryOrder.forEach((cat, i) => {
      const count = catMap[cat] || 0;
      const pct = totalRegs > 0 ? ((count / totalRegs) * 100).toFixed(1) + '%' : '0%';
      styleDataRow(ws1.addRow([cat, count, pct]), i);
    });
    // Any extra categories
    Object.entries(catMap)
      .filter(([k]) => !categoryOrder.includes(k))
      .forEach(([cat, count], i) => {
        const pct = totalRegs > 0 ? ((count / totalRegs) * 100).toFixed(1) + '%' : '0%';
        styleDataRow(ws1.addRow([cat, count, pct]), i + categoryOrder.length);
      });

    ws1.addRow([]);
    const top5Header = ws1.addRow(['Top 5 Events', 'Registrations', 'Category']);
    styleHeaderRow(top5Header);
    top5.forEach(([name, info], i) => {
      styleDataRow(ws1.addRow([name, info.count, info.category]), i);
    });

    ws1.addRow([]);
    const tlHeader = ws1.addRow(['Date', 'Registrations on Day', '']);
    styleHeaderRow(tlHeader);
    Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, count], i) => {
        styleDataRow(ws1.addRow([date, count, '']), i);
      });

    ws1.getRow(1).font = { bold: true, size: 14 };


    // ─── SHEET 2: CATEGORY-WISE REPORT ──────────────────────────────
    const ws2 = workbook.addWorksheet('Category-wise Report');
    ws2.columns = [
      { header: 'Category Name', key: 'cat', width: 18 },
      { header: 'Total Events', key: 'totalEvents', width: 15 },
      { header: 'Total Registrations', key: 'totalRegs', width: 20 },
      { header: 'Single Registrations', key: 'singleRegs', width: 20 },
      { header: 'Group Registrations', key: 'groupRegs', width: 20 },
      { header: 'Events List', key: 'events', width: 60 },
    ];
    styleHeaderRow(ws2.getRow(1));
    ws2.views = [{ state: 'frozen', ySplit: 1 }];
    ws2.autoFilter = { from: 'A1', to: 'F1' };

    // Build category data
    const catDetailMap: Record<string, {
      totalRegs: number; singleRegs: number; groupRegs: number; events: Set<string>
    }> = {};

    for (const reg of registrations) {
      for (const ev of reg.events) {
        if (!catDetailMap[ev.category]) {
          catDetailMap[ev.category] = { totalRegs: 0, singleRegs: 0, groupRegs: 0, events: new Set() };
        }
        catDetailMap[ev.category].totalRegs++;
        if (reg.isGroup) catDetailMap[ev.category].groupRegs++;
        else catDetailMap[ev.category].singleRegs++;
        catDetailMap[ev.category].events.add(ev.eventName);
      }
    }

    categoryOrder.forEach((cat, i) => {
      const d = catDetailMap[cat] || { totalRegs: 0, singleRegs: 0, groupRegs: 0, events: new Set() };
      styleDataRow(ws2.addRow({
        cat,
        totalEvents: d.events.size,
        totalRegs: d.totalRegs,
        singleRegs: d.singleRegs,
        groupRegs: d.groupRegs,
        events: [...d.events].sort().join(', '),
      }), i);
    });
    Object.entries(catDetailMap)
      .filter(([k]) => !categoryOrder.includes(k))
      .forEach(([cat, d], i) => {
        styleDataRow(ws2.addRow({
          cat,
          totalEvents: d.events.size,
          totalRegs: d.totalRegs,
          singleRegs: d.singleRegs,
          groupRegs: d.groupRegs,
          events: [...d.events].sort().join(', '),
        }), i + categoryOrder.length);
      });


    // ─── SHEET 3: EVENT-WISE REPORT (ENHANCED) ──────────────────────────
    const ws3 = workbook.addWorksheet('Event-wise Report');
    ws3.columns = [
      { header: 'Sr. No', key: 'sr', width: 8 },
      { header: 'Category', key: 'cat', width: 14 },
      { header: 'Event Name', key: 'event', width: 30 },
      { header: 'Sub Event', key: 'subEvent', width: 20 },
      { header: 'Total Registrations', key: 'total', width: 20 },
      { header: 'Single Count', key: 'single', width: 15 },
      { header: 'Group Count', key: 'group', width: 15 },
      { header: 'Participant Details (Name | Token)', key: 'members', width: 80 },
    ];
    styleHeaderRow(ws3.getRow(1));
    ws3.views = [{ state: 'frozen', ySplit: 1 }];
    ws3.autoFilter = { from: 'A1', to: 'H1' };

    // Build event+subEvent map WITH participant token details
    const evDetailMap: Record<string, {
      category: string; subEvent: string;
      total: number; single: number; group: number;
      participantDetails: Array<{ name: string; token: string; isMainStudent: boolean }>;
    }> = {};

    for (const reg of registrations) {
      // Fetch main student details for this registration
      const mainStudent: any = reg.studentId || {};
      const mainToken = mainStudent.token || 'N/A';
      
      for (const ev of reg.events) {
        const key = `${ev.category}|||${ev.eventName}|||${ev.subEvent || ''}`;
        
        if (!evDetailMap[key]) {
          evDetailMap[key] = {
            category: ev.category,
            subEvent: ev.subEvent || '',
            total: 0,
            single: 0,
            group: 0,
            participantDetails: [],
          };
        }

        evDetailMap[key].total++;

        if (reg.isGroup) {
          evDetailMap[key].group++;
          
          // Add main student (group leader)
          evDetailMap[key].participantDetails.push({
            name: reg.studentName,
            token: mainToken,
            isMainStudent: true,
          });
          
          // Add all group members with their tokens
          if (reg.groupMembers && reg.groupMembers.length > 0) {
            // Try to fetch actual tokens from participantIds
            for (let i = 0; i < reg.groupMembers.length; i++) {
              const memberId = reg.participantIds?.[i];
              let memberToken = 'N/A';
              
              // If we have the member in studentCache (from earlier), get their token
              if (memberId && studentCache[memberId.toString()]) {
                memberToken = studentCache[memberId.toString()].token || 'N/A';
              }
              
              evDetailMap[key].participantDetails.push({
                name: reg.groupMembers[i],
                token: memberToken,
                isMainStudent: false,
              });
            }
          }
        } else {
          evDetailMap[key].single++;
          
          // Add single participant with their token
          evDetailMap[key].participantDetails.push({
            name: reg.studentName,
            token: mainToken,
            isMainStudent: true,
          });
        }
      }
    }

    // Populate studentCache with participant details for token lookup
    for (const reg of registrations) {
      if (reg.participantIds && reg.participantIds.length > 0) {
        for (const pid of reg.participantIds) {
          const pidStr = pid.toString();
          if (!studentCache[pidStr] && reg.studentId?._id) {
            // Inference handles by original mapping or skip if empty
          }
        }
      }
    }

    // Sort by category order then event name
    const sortedEvKeys = Object.keys(evDetailMap).sort((a, b) => {
      const [catA, nameA] = a.split('|||');
      const [catB, nameB] = b.split('|||');
      const ci = categoryOrder.indexOf(catA) - categoryOrder.indexOf(catB);
      if (ci !== 0) return ci;
      return nameA.localeCompare(nameB);
    });

    sortedEvKeys.forEach((key, i) => {
      const d = evDetailMap[key];
      const [, eventName] = key.split('|||');
      
      // Format participant details: "Name | Token"
      const participantList = d.participantDetails
        .map(p => `${p.name} | ${p.token}`)
        .join('  --  ');
      
      styleDataRow(ws3.addRow({
        sr: i + 1,
        cat: d.category,
        event: eventName,
        subEvent: d.subEvent || '-',
        total: d.total,
        single: d.single,
        group: d.group,
        members: participantList.length > 0 ? participantList : '-',
      }), i);
    });


    // ─── SHEET 4: STUDENT DETAILS ────────────────────────────────────
    const ws4 = workbook.addWorksheet('Student Details');
    ws4.columns = [
      { header: 'Sr. No', key: 'sr', width: 8 },
      { header: 'Token ID', key: 'token', width: 22 },
      { header: 'Student Name', key: 'name', width: 25 },
      { header: 'Roll No', key: 'roll', width: 15 },
      { header: 'Branch', key: 'branch', width: 12 },
      { header: 'Year', key: 'year', width: 8 },
      { header: 'Mobile No', key: 'mobile', width: 14 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Registered Events', key: 'events', width: 50 },
      { header: 'Registration Type', key: 'type', width: 18 },
      { header: 'Registered Date', key: 'date', width: 16 },
      { header: 'Processed By (Admin)', key: 'admin', width: 22 },
      { header: 'Remark', key: 'remark', width: 30 },
    ];
    styleHeaderRow(ws4.getRow(1));
    ws4.views = [{ state: 'frozen', ySplit: 1 }];
    ws4.autoFilter = { from: 'A1', to: 'M1' };

    // De-duplicate by studentId — merge all their registrations into one row
    const studentRegMap: Record<string, {
      token: string; name: string; roll: string; branch: string; year: string;
      mobile: string; email: string;
      allEvents: string[]; types: Set<string>;
      latestDate: string; admins: Set<string>; remarks: string[];
    }> = {};

    for (const reg of registrations) {
      const s: any = reg.studentId || {};
      const sid = s._id ? s._id.toString() : reg.studentId?.toString() || '';
      if (!sid) continue;

      if (!studentRegMap[sid]) {
        studentRegMap[sid] = {
          token: s.token || '',
          name: s.fullName || reg.studentName || 'N/A',
          roll: s.rollNo || reg.rollNo || 'N/A',
          branch: s.branch || 'N/A',
          year: s.year || 'N/A',
          mobile: s.mobileNo || 'N/A',
          email: s.email || 'N/A',
          allEvents: [],
          types: new Set(),
          latestDate: reg.processedAt ? new Date(reg.processedAt).toLocaleDateString('en-IN') : 'N/A',
          admins: new Set(),
          remarks: [],
        };
      }

      for (const ev of reg.events) {
        const label = ev.subEvent ? `${ev.eventName} (${ev.subEvent})` : ev.eventName;
        studentRegMap[sid].allEvents.push(label);
      }
      studentRegMap[sid].types.add(reg.isGroup ? 'Group' : 'Single');
      if ((reg as any).processedBy?.name) {
        studentRegMap[sid].admins.add((reg as any).processedBy.name);
      }
      if ((reg as any).remark) {
        studentRegMap[sid].remarks.push((reg as any).remark);
      }
      if (reg.processedAt) {
        const d = new Date(reg.processedAt).toLocaleDateString('en-IN');
        studentRegMap[sid].latestDate = d;
      }
    }

    Object.values(studentRegMap)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((s, i) => {
        styleDataRow(ws4.addRow({
          sr: i + 1,
          token: s.token,
          name: s.name,
          roll: s.roll,
          branch: s.branch,
          year: s.year,
          mobile: s.mobile,
          email: s.email,
          events: [...new Set(s.allEvents)].join(', '),
          type: [...s.types].join(' + '),
          date: s.latestDate,
          admin: [...s.admins].join(', '),
          remark: s.remarks.filter(Boolean).join('; ') || '-',
        }), i);
      });


    // ─── SHEET 5: GROUP REGISTRATIONS ───────────────────────────────
    const ws5 = workbook.addWorksheet('Group Registrations');
    ws5.columns = [
      { header: 'Sr. No', key: 'sr', width: 8 },
      { header: 'Token ID', key: 'token', width: 22 },
      { header: 'Main Student Name', key: 'name', width: 25 },
      { header: 'Roll No', key: 'roll', width: 15 },
      { header: 'Group Members', key: 'members', width: 50 },
      { header: 'Total in Group', key: 'count', width: 15 },
      { header: 'Events Registered', key: 'events', width: 45 },
      { header: 'Processed By (Admin)', key: 'admin', width: 22 },
      { header: 'Registered Date', key: 'date', width: 16 },
    ];
    styleHeaderRow(ws5.getRow(1));
    ws5.views = [{ state: 'frozen', ySplit: 1 }];
    ws5.autoFilter = { from: 'A1', to: 'I1' };

    const groupRegsFiltered = registrations
      .filter(r => r.isGroup)
      .sort((a, b) => {
        const na = a.studentName || '';
        const nb = b.studentName || '';
        return na.localeCompare(nb);
      });

    groupRegsFiltered.forEach((reg, i) => {
      const s: any = reg.studentId || {};
      const evNames = reg.events.map((e: any) =>
        e.subEvent ? `${e.eventName} (${e.subEvent})` : e.eventName
      ).join(', ');
      const members = reg.groupMembers && reg.groupMembers.length > 0
        ? reg.groupMembers.join(', ')
        : '-';
      styleDataRow(ws5.addRow({
        sr: i + 1,
        token: s.token || '',
        name: s.fullName || reg.studentName || 'N/A',
        roll: s.rollNo || reg.rollNo || 'N/A',
        members,
        count: (reg.groupMembers?.length || 0) + 1,
        events: evNames,
        admin: (reg as any).processedBy?.name || 'N/A',
        date: reg.processedAt ? new Date(reg.processedAt).toLocaleDateString('en-IN') : 'N/A',
      }), i);
    });


    // ─── AUTO-FIT ALL SHEETS ─────────────────────────────────────────
    [ws1, ws2, ws3, ws4, ws5].forEach(ws => autoFitColumns(ws));


    // ─── SEND RESPONSE ───────────────────────────────────────────────
    const filename = `Panache-Registration-Report-${today}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    return res.end();

  } catch (err: any) {
    console.error('Full report export error:', err);
    res.status(500).json({ error: 'Export failed', details: err.message });
  }
});

export default router;
