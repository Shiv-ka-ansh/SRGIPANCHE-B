import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import dotenv from 'dotenv';
import path from 'path';
import ScheduleEntry from '../models/ScheduleEntry';

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/panache2k26';

async function importSchedule() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing schedule
    console.log('🧹 Clearing existing schedule...');
    await ScheduleEntry.deleteMany({});

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname, '../../PANACHE SCHEDULE.xlsx'));

    const dailySheets = [
      { name: '06 APRIL', day: 'Day 1' },
      { name: '07 APRIL', day: 'Day 2' },
      { name: '08 APRIL', day: 'Day 3' },
      { name: '09 APRIL', day: 'Day 4' },
      { name: '10 APRIL', day: 'Day 5' }
    ];

    const entriesToSave: any[] = [];

    for (const sheetInfo of dailySheets) {
      const worksheet = workbook.getWorksheet(sheetInfo.name);
      if (!worksheet) {
        console.warn(`⚠️ Sheet ${sheetInfo.name} not found!`);
        continue;
      }

      console.log(`📄 Processing sheet: ${sheetInfo.name} (${sheetInfo.day})`);

      // Extract date from the first row (e.g., "PANACHE 2K26 - 06-APRIL-2026")
      let dateStr = '';
      const titleRow = worksheet.getRow(1);
      const titleCell = titleRow.getCell(2).value;
      if (titleCell && typeof titleCell === 'string') {
        dateStr = titleCell.split(' - ')[1]?.trim() || '';
      }

      worksheet.eachRow((row, rowNumber) => {
        // Skip first two rows (Title and Headers)
        if (rowNumber < 3) return;

        // Use getCell for more reliable column mapping
        const sNo = row.getCell(1).value;
        // Helper to extract string from different cell types
        const getCellValue = (cell: any): string => {
          if (!cell || cell.value === null || cell.value === undefined) return '';
          if (typeof cell.value === 'string') return cell.value;
          if (typeof cell.value === 'number') return cell.value.toString();
          if (cell.value.text) return cell.value.text;
          if (cell.value.result) return cell.value.result.toString();
          return cell.value.toString();
        };

        const eventNameStr = getCellValue(row.getCell(2));
        const timeStr = getCellValue(row.getCell(4));

        if (eventNameStr && timeStr) {
          const sNoValue = row.getCell(1).value;
          entriesToSave.push({
            day: sheetInfo.day,
            date: dateStr,
            time: timeStr,
            eventName: eventNameStr,
            category: getCellValue(row.getCell(3)) || 'GENERAL',
            venue: getCellValue(row.getCell(5)) || 'TBD',
            description: getCellValue(row.getCell(6)),
            order: typeof sNoValue === 'number' ? sNoValue : parseInt(sNoValue as string) || 0
          });
        }
      });
    }

    if (entriesToSave.length > 0) {
      await ScheduleEntry.insertMany(entriesToSave);
      console.log(`✅ Successfully imported ${entriesToSave.length} entries!`);
    } else {
      console.log('⚠️ No entries found to import.');
    }

    await mongoose.disconnect();
    console.log('🛑 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error importing schedule:', error);
    process.exit(1);
  }
}

importSchedule();
