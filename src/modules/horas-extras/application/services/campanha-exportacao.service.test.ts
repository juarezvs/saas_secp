import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { csvCampanha, xlsxCampanha } from "./campanha-exportacao.service";
describe("exportação interna de projetos",()=>{
 it("protege fórmulas e preserva aspas no CSV",()=>{const csv=csvCampanha([["=WEBSERVICE(\"x\")","+1",5]]);expect(csv).toContain("'=WEBSERVICE");expect(csv).toContain("''".slice(0,1)+"+1");expect(csv).toContain('""x""');});
 it("gera OOXML válido estruturalmente, sem fórmulas executáveis",()=>{const files=unzipSync(xlsxCampanha([["Nome","Minutos"],["=1+1",120]]));expect(files["[Content_Types].xml"]).toBeDefined();const sheet=strFromU8(files["xl/worksheets/sheet1.xml"]);expect(sheet).toContain('t="inlineStr"');expect(sheet).not.toContain("<f>");expect(sheet).toContain("<v>120</v>");});
});
