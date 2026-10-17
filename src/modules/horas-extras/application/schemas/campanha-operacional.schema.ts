import { z } from "zod";
import { parseIsoDateOnly } from "../services/horas-extras-datas.service";

const date=z.string().refine(v=>{try {parseIsoDateOnly(v);return true;}catch{return false;}},"Data inválida.");
const text=z.string().trim().min(30,"Descreva especificamente, com pelo menos 30 caracteres.").max(8000);
const money=z.string().regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/,"Valor monetário inválido.");
export const campanhaOperacionalSchema=z.object({
 campaignId:z.uuid().optional(),orgaoId:z.uuid(),code:z.string().trim().min(3).max(80),name:z.string().trim().min(5).max(200),
 fiscalYear:z.coerce.number().int().min(2025).max(2100),seiProcess:z.string().trim().min(5).max(80),authorizationDocument:z.string().trim().min(3).max(160),
 validFrom:date,validUntil:date,projectDeadline:date,proofDeadline:date,
 description:text,criteria:text,workflow:z.array(z.enum(["ADMIN_REVIEW","BUDGET_REVIEW","AUTHORITY_REVIEW"])).default(["ADMIN_REVIEW","BUDGET_REVIEW","AUTHORITY_REVIEW"]),
 accounts:z.array(z.object({unitId:z.uuid(),referenceAmount:money})).min(1).max(200),
}).superRefine((v,c)=>{
 if(v.validFrom>v.validUntil)c.addIssue({code:"custom",message:"Vigência invertida.",path:["validUntil"]});
 if(v.proofDeadline<v.projectDeadline)c.addIssue({code:"custom",message:"Comprovação não pode anteceder o prazo dos projetos.",path:["proofDeadline"]});
 if(new Set(v.accounts.map(a=>a.unitId)).size!==v.accounts.length)c.addIssue({code:"custom",message:"Unidades duplicadas.",path:["accounts"]});
 if(v.workflow.length!==3||new Set(v.workflow).size!==3||v.workflow[2]!=="AUTHORITY_REVIEW")c.addIssue({code:"custom",message:"As três análises são obrigatórias, com decisão da autoridade ao final.",path:["workflow"]});
});
export const projetoCampanhaSchema=z.object({
 campaignId:z.uuid(),accountId:z.uuid(),projectId:z.uuid().optional(),title:z.string().trim().min(5).max(200),seiProcess:z.string().trim().min(5).max(80),
 justification:text,activities:text,expectedResults:text,ordinaryImpossibility:text,urgencyReason:z.string().trim().max(4000).optional(),amendmentReason:z.string().trim().max(4000).optional(),
 activityClass:z.enum(["ESSENCIAL","EVENTO_SEM_REVEZAMENTO","REPARO_INADIAVEL","ESFORCO_CONCENTRADO"]).default("ESFORCO_CONCENTRADO"),
 items:z.array(z.object({employeeId:z.uuid(),date,startTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),endTime:z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/),breakMinutes:z.coerce.number().int().min(0).max(120).default(0),activity:text,destination:z.enum(["PECUNIA","BANCO_DE_HORAS"]),estimatedAmount:money})).min(1).max(500),
});
export const decisaoProjetoSchema=z.object({
 versionId:z.uuid(),action:z.enum(["SUBMIT","ADMIN_APPROVE","BUDGET_APPROVE","AUTHORIZE","START","PROCESS","DOCUMENT_EXECUTION","DOCUMENT_BANK","RECALCULATE","PROVE","HOMOLOGATE","FINANCIAL","RELEASE_PAYMENT","CONVERT","COMPLETE_BANK","COMPLETE_NO_CREDIT","CONFIRM_PAYROLL","RETURN","REJECT","CANCEL"]),
 reason:z.string().trim().min(10).max(8000),seiDocument:z.string().trim().min(1).max(160),
 items:z.array(z.object({id:z.uuid(),minutes:z.coerce.number().int().min(0).max(960),reason:z.string().trim().min(5).max(4000)})).max(500).optional(),
 results:z.string().trim().max(8000).optional(),documents:z.string().trim().max(4000).optional(),
 deadlineDecision:z.string().trim().max(4000).optional(),expiresOn:date.optional(),
 bankRegularizedOn:date.optional(),
});
export const rubricaCampanhaSchema=z.object({orgaoId:z.uuid(),code:z.string().trim().min(1).max(80),description:z.string().trim().min(5).max(250),nature:z.string().trim().min(3).max(100),includesInBase:z.boolean(),normativeBasis:text,validFrom:date,validUntil:date.optional()});
export const remuneracaoCampanhaSchema=z.object({employeeId:z.uuid(),validFrom:date,validUntil:date,seiDocument:z.string().trim().min(3).max(160),replacesId:z.uuid().optional(),components:z.array(z.object({code:z.string().min(1),amountCentavos:z.number().int().min(0).max(100000000)})).min(1).max(100)}).refine(v=>v.validFrom<=v.validUntil,"Vigência invertida.");
export type ProjetoCampanhaInput=z.infer<typeof projetoCampanhaSchema>;
