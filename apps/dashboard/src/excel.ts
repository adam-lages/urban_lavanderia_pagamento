const xmlEscape = (v: string) => v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export function excelXml(sheetName: string, header: string[], rows: string[][]) {
  const cell = (v: string) => `<Cell><Data ss:Type="String">${xmlEscape(v)}</Data></Cell>`;
  const rowXml = (cols: string[]) => `<Row>${cols.map(cell).join("")}</Row>`;
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="${xmlEscape(sheetName)}"><Table>
${rowXml(header)}
${rows.map(rowXml).join("\n")}
</Table></Worksheet></Workbook>`;
}

export function downloadExcel(filename: string, header: string[], rows: string[][], sheetName = "Dados") {
  const blob = new Blob([excelXml(sheetName, header, rows)], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
