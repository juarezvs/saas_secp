"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { fecharLoteFolhaSeguro } from "../services/gerar-lote-folha-seguro.service";
import { contextoCampanhaSessao } from "./campanha-operacional.actions";
export async function fecharLoteFolhaHorasExtrasAction(f:FormData) {
 const batch=await fecharLoteFolhaSeguro(prisma,await contextoCampanhaSessao(),String(f.get("batchId")??""));
 revalidatePath("/folha/horas-extras");revalidatePath(`/folha/horas-extras/${batch.id}`);redirect(`/folha/horas-extras/${batch.id}`);
}
