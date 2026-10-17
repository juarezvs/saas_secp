"use server";

import { revalidatePath } from "next/cache";
import { obterPermissoesDaSessao } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { classificarDiaInstitucional } from "@/modules/calendario-institucional/application/services/classificar-dia-institucional.service";
import { mapClassificacaoInstitucionalParaOvertimeDayType } from "../services/horas-extras-datas.service";
import { alterarStatusCampanha, cadastrarRemuneracaoCampanha, cadastrarRubricaCampanha, criarCampanhaOperacional, decidirProjetoCampanha, salvarProjetoCampanha, type ContextoCampanha } from "../services/campanha-operacional.service";
import { executarOperacaoOrcamentoCampanha } from "../services/orcamento-campanha-horas-extras.service";
import { complementarReservaProjeto } from "../services/campanha-operacional.service";
import { registrarFruicaoExtraordinaria } from "../services/credito-extraordinario.service";
import { cadastrarRestricaoCampanha } from "../services/campanha-operacional.service";

export type EstadoAcaoCampanha={success:boolean;message:string;href?:string};
export async function contextoCampanhaSessao():Promise<ContextoCampanha> {
 const p=await obterPermissoesDaSessao();
 if(!p.permitido||!p.usuarioId||!p.perfilAtivoCodigo)throw new Error("Sessão expirada. Entre novamente.");
 return {usuarioId:p.usuarioId,perfilAtivoCodigo:p.perfilAtivoCodigo,permissoes:p.permissoes,escopo:{global:p.perfilAtivoEscopoGlobal===true,orgaoIds:p.orgaoIds??[]}};
}
const calendar=async(date:string,employeeId:string)=>{
 const d=await classificarDiaInstitucional(new Date(`${date}T00:00:00Z`),undefined,employeeId);
 return {dayType:mapClassificacaoInstitucionalParaOvertimeDayType(d),businessDay:d.contaComoDiaUtil};
};
const value=(f:FormData,k:string)=>String(f.get(k)??"").trim();
const payload=(f:FormData)=>JSON.parse(value(f,"payload"));
function refresh() {for(const path of ["/horas-extras/campanhas","/horas-extras/projetos","/horas-extras/banco","/horas-extras/remuneracao","/horas-extras/autorizacoes","/folha/horas-extras"])revalidatePath(path,"layout");}
async function run(task:()=>Promise<{message:string;href?:string}>):Promise<EstadoAcaoCampanha> {
 try {const result=await task();refresh();return {success:true,...result};}catch(e){return {success:false,message:e instanceof Error?e.message:"Operação indisponível. Tente novamente."};}
}
export async function criarCampanhaAction(_:EstadoAcaoCampanha,f:FormData) {
 return run(async()=>{const c=await criarCampanhaOperacional(prisma,await contextoCampanhaSessao(),payload(f));return {message:"Campanha criada em rascunho, sem recursos financeiros presumidos.",href:`/horas-extras/campanhas/${c.id}`};});
}
export async function statusCampanhaAction(_:EstadoAcaoCampanha,f:FormData) {
 return run(async()=>{const status=value(f,"status");if(!["ACTIVE","CLOSED","CANCELLED"].includes(status))throw new Error("Situação inválida.");await alterarStatusCampanha(prisma,await contextoCampanhaSessao(),value(f,"campaignId"),status as "ACTIVE"|"CLOSED"|"CANCELLED",value(f,"reason"));return {message:"Situação da campanha atualizada."};});
}
export async function orcamentoCampanhaAction(_:EstadoAcaoCampanha,f:FormData) {
 return run(async()=>{await executarOperacaoOrcamentoCampanha(prisma,await contextoCampanhaSessao(),payload(f));return {message:"Movimentação registrada e auditada."};});
}
export async function salvarProjetoCampanhaAction(_:EstadoAcaoCampanha,f:FormData) {
 return run(async()=>{const v=await salvarProjetoCampanha(prisma,await contextoCampanhaSessao(),payload(f),calendar);return {message:"Versão do projeto salva. Confira e envie para análise.",href:`/horas-extras/projetos/${v.projectId}`};});
}
export async function decidirProjetoCampanhaAction(_:EstadoAcaoCampanha,f:FormData) {
 return run(async()=>{const v=await decidirProjetoCampanha(prisma,await contextoCampanhaSessao(),payload(f),calendar);return {message:"Etapa registrada com sucesso.",href:`/horas-extras/projetos/${v.projectId}`};});
}
export async function rubricaCampanhaAction(_:EstadoAcaoCampanha,f:FormData) {
 return run(async()=>{await cadastrarRubricaCampanha(prisma,await contextoCampanhaSessao(),payload(f));return {message:"Rubrica validada e registrada."};});
}
export async function remuneracaoCampanhaAction(_:EstadoAcaoCampanha,f:FormData) {
 return run(async()=>{await cadastrarRemuneracaoCampanha(prisma,await contextoCampanhaSessao(),payload(f));return {message:"Remuneração histórica registrada. Cálculos anteriores foram preservados."};});
}
export async function complementarReservaAction(_:EstadoAcaoCampanha,f:FormData) {
 return run(async()=>{await complementarReservaProjeto(prisma,await contextoCampanhaSessao(),value(f,"versionId"),value(f,"amount").replace(",","."),value(f,"reason"),value(f,"seiDocument"),value(f,"idempotencyKey")||undefined);return {message:"Reserva complementar registrada."};});
}
export async function fruicaoExtraordinariaAction(_:EstadoAcaoCampanha,f:FormData) {
 return run(async()=>{await registrarFruicaoExtraordinaria(prisma,await contextoCampanhaSessao(),Object.fromEntries(f.entries()));return {message:"Folga autorizada e registrada no controle de frequência, com consumo do crédito extraordinário."};});
}
export async function restricaoCampanhaAction(_:EstadoAcaoCampanha,f:FormData) {
 return run(async()=>{await cadastrarRestricaoCampanha(prisma,await contextoCampanhaSessao(),Object.fromEntries(f.entries()));return {message:"Limite documentado de horário especial registrado."};});
}
