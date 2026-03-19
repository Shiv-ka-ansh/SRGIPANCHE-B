import { Router } from 'express';
import { Parser } from 'json2csv';
import exceljs from 'exceljs';
import Student from '../models/Student';
import EventRegistration from '../models/EventRegistration';
import { verifyToken, requireSuperAdmin } from '../middleware/auth';

const router = Router();

// GET /api/export/csv
router.get('/csv', verifyToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const students = await Student.find().sort({ registeredAt: 1 }).lean();
    const registrations = await EventRegistration.find().lean();
    
    // Map registrations by studentId for fast lookup
    const regMap = new Map();
    registrations.forEach(reg => {
      regMap.set(reg.studentId.toString(), reg);
    });

    const data = students.map((s, index) => {
      const reg = regMap.get(s._id.toString());
      const eventsStr = reg ? reg.events.map((e: any) => e.eventName).join(', ') : '';
      const totalAmount = reg ? reg.totalAmount : 0;

      return {
        Sr: index + 1,
        Name: s.fullName,
        'Roll No': s.rollNo,
        Token: s.token,
        Course: s.course,
        Branch: s.branch,
        Section: s.section,
        Year: s.year,
        Mobile: s.mobileNo,
        Email: s.email,
        'Registered At': s.registeredAt.toISOString().split('T')[0],
        Events: eventsStr,
        'Total Amount': totalAmount,
      };
    });

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment('panache-2k26-registrations.csv');
    return res.send(csv);
  } catch (error) {
    next(error);
  }
});

// GET /api/export/excel
router.get('/excel', verifyToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const students = await Student.find().sort({ registeredAt: 1 }).lean();
    const registrations = await EventRegistration.find().lean();
    
    const regMap = new Map();
    registrations.forEach(reg => { regMap.set(reg.studentId.toString(), reg); });

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Registrations');

    worksheet.columns = [
      { header: 'Sr', key: 'sr', width: 5 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Roll No', key: 'rollNo', width: 15 },
      { header: 'Token', key: 'token', width: 10 },
      { header: 'Course', key: 'course', width: 10 },
      { header: 'Branch', key: 'branch', width: 15 },
      { header: 'Section', key: 'section', width: 10 },
      { header: 'Year', key: 'year', width: 10 },
      { header: 'Mobile', key: 'mobile', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Registered At', key: 'regAt', width: 15 },
      { header: 'Events', key: 'events', width: 30 },
      { header: 'Total Amount', key: 'amount', width: 15 },
    ];

    // Styling headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFF00' } };

    students.forEach((s, index) => {
      const reg = regMap.get(s._id.toString());
      const eventsStr = reg ? reg.events.map((e: any) => e.eventName).join(', ') : '';
      const totalAmount = reg ? reg.totalAmount : 0;

      const row = worksheet.addRow({
        sr: index + 1,
        name: s.fullName,
        rollNo: s.rollNo,
        token: s.token,
        course: s.course,
        branch: s.branch,
        section: s.section,
        year: s.year,
        mobile: s.mobileNo,
        email: s.email,
        regAt: s.registeredAt.toISOString().split('T')[0],
        events: eventsStr,
        amount: totalAmount,
      });

      // Alternating row colors
      if (index % 2 === 1) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      }
    });

    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment('panache-2k26-registrations.xlsx');
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
});

export default router;
