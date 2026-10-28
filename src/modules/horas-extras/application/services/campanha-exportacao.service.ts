import { strToU8, zipSync } from "fflate";
export function textoCsvSeguro(value:unknown) {
 const raw=String(value??"");const safe=/^[\s]*[=+\-@\t\r]/.test(raw)?`'${raw}`:raw;
 return `"${safe.replaceAll('"','""')}"`;
}
export function csvCampanha(rows:Array<Array<string|number>>) {return "\uFEFF"+rows.map(row=>row.map(textoCsvSeguro).join(";")).join("\r\n");}
const xml=(v:unknown)=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&apos;").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,"");
/** OOXML com células textuais explícitas: nenhum conteúdo do usuário é fórmula. */
export function xlsxCampanha(rows:Array<Array<string|number>>) {
 const files:Record<string,Uint8Array>={};
 files['[Content_Types].xml']=strToU8('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
 files['_rels/.rels']=strToU8('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
 files['xl/workbook.xml']=strToU8('<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Projeto de horas extras" sheetId="1" r:id="rId1"/></sheets></workbook>');
 files['xl/_rels/workbook.xml.rels']=strToU8('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
 const letter=(index:number):string=>index<26?String.fromCharCode(65+index):letter(Math.floor(index/26)-1)+letter(index%26);
 files['xl/worksheets/sheet1.xml']=strToU8(`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((row,r)=>`<row r="${r+1}">${row.map((v,c)=>typeof v==="number"&&Number.isFinite(v)?`<c r="${letter(c)}${r+1}"><v>${v}</v></c>`:`<c r="${letter(c)}${r+1}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`).join("")}</row>`).join("")}</sheetData></worksheet>`);
 return zipSync(files,{level:1});
}
