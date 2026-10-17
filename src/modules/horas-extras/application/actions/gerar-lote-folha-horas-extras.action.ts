"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { gerarLoteFolhaHorasExtrasSchema, type GerarLoteFolhaHorasExtrasFormState } from "../schemas/horas-extras-lote-folha.schema";
import { gerarLoteFolhaSeguro } from "../services/gerar-lote-folha-seguro.service";
import { contextoCampanhaSessao } from "./campanha-operacional.actions";
export async function gerarLoteFolhaHorasExtrasAction(_:GerarLoteFolhaHorasExtrasFormState,f:FormData):Promise<GerarLoteFolhaHorasExtrasFormState> {
 const parsed=gerarLoteFolhaHorasExtrasSchema.safeParse({orgaoId:String(f.get("orgaoId")??""),competence:String(f.get("competence")??"")});
 if(!parsed.success)return {sucesso:false,mensagem:"Verifique os dados do lote.",erros:parsed.error.flatten().fieldErrors};
 let id:string;
 try {const batch=await gerarLoteFolhaSeguro(prisma,await contextoCampanhaSessao(),parsed.data.orgaoId,parsed.data.competence);id=batch.id;}
 catch(e){return {sucesso:false,mensagem:e instanceof Error?e.message:"Não foi possível gerar o lote.",campos:parsed.data};}
 revalidatePath("/folha/horas-extras");revalidatePath("/horas-extras/campanhas");redirect(`/folha/horas-extras/${id}`);
}
