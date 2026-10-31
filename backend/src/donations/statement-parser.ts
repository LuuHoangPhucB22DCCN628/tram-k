import { BadRequestException } from "@nestjs/common";
import { parse } from "csv-parse/sync";
import * as ExcelJS from "exceljs";

export interface StatementFile {
  readonly originalname: string;
  readonly buffer: Buffer;
}

export interface StatementSheet {
  readonly sheets: readonly string[];
  readonly selectedSheet: string;
  readonly rows: readonly (readonly string[])[];
}

const MAX_ROWS = 5001;
const MAX_COLUMNS = 40;

export async function parseStatement(file: StatementFile | undefined, sheetName?: string): Promise<StatementSheet> {
  if (!file?.buffer?.length) throw new BadRequestException("Vui lòng chọn tệp sao kê.");
  if (file.buffer.length > 5 * 1024 * 1024) throw new BadRequestException("Tệp sao kê không được vượt quá 5 MB.");
  const name = file.originalname.toLowerCase();
  if (name.endsWith(".csv")) {
    if (sheetName && sheetName !== "CSV") throw new BadRequestException("CSV không có sheet để chọn.");
    let content: string;
    try {
      content = new TextDecoder("utf-8", { fatal: true }).decode(file.buffer).replace(/^\uFEFF/, "");
    } catch {
      throw new BadRequestException("CSV phải được lưu bằng mã hóa UTF-8.");
    }
    let records: string[][];
    try {
      records = parse(content, { delimiter: detectDelimiter(content), relax_column_count: true, skip_empty_lines: true, bom: true });
    } catch {
      throw new BadRequestException("Không đọc được CSV. Hãy kiểm tra dấu phân cách và dấu ngoặc kép.");
    }
    return { sheets: ["CSV"], selectedSheet: "CSV", rows: validateRows(records) };
  }
  if (!name.endsWith(".xlsx")) throw new BadRequestException("Chỉ hỗ trợ tệp .csv hoặc .xlsx.");
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(file.buffer as unknown as ExcelJS.Buffer);
  } catch {
    throw new BadRequestException("Không đọc được tệp Excel .xlsx.");
  }
  const sheets = workbook.worksheets.map((sheet) => sheet.name);
  const selectedSheet = sheetName || sheets[0];
  const worksheet = workbook.getWorksheet(selectedSheet);
  if (!worksheet) throw new BadRequestException("Không tìm thấy sheet được chọn.");
  if (worksheet.rowCount > MAX_ROWS || worksheet.columnCount > MAX_COLUMNS) {
    throw new BadRequestException("Sao kê tối đa 5.000 dòng và 40 cột mỗi lần nhập.");
  }
  const rows: string[][] = [];
  worksheet.eachRow((row) => {
    const values: string[] = [];
    for (let index = 1; index <= Math.min(worksheet.columnCount, MAX_COLUMNS); index += 1) {
      const cell = row.getCell(index);
      values.push(cell.value instanceof Date ? cell.value.toISOString() : cell.text.trim());
    }
    rows.push(values);
  });
  return { sheets, selectedSheet, rows: validateRows(rows) };
}

function validateRows(rows: string[][]): readonly (readonly string[])[] {
  if (rows.length < 2) throw new BadRequestException("Tệp cần có dòng tiêu đề và ít nhất một giao dịch.");
  if (rows.length > MAX_ROWS || rows.some((row) => row.length > MAX_COLUMNS)) {
    throw new BadRequestException("Sao kê tối đa 5.000 dòng và 40 cột mỗi lần nhập.");
  }
  return rows;
}

function detectDelimiter(content: string): string {
  const firstLine = content.split(/\r?\n/, 1)[0] || "";
  const choices = [",", ";", "\t"];
  return choices.sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
}
