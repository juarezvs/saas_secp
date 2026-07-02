import { redirect } from "next/navigation";

import { painelExecutivoInicial } from "@/modules/painel-executivo/presentation/painel-executivo-data";

export default function PainelExecutivoIndexPage() {
  redirect(`/painel-executivo/${painelExecutivoInicial.slug}`);
}
