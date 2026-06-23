import Link from "next/link";
import { ArrowLeft, Cpu } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarUnidadesParaEquipamentos } from "@/modules/integracoes/infrastructure/repositories/integracoes.repository";
import { EquipamentoBiometricoForm } from "@/modules/integracoes/presentation/components/equipamento-biometrico-form";

export default async function NovoEquipamentoPage() {
  await exigirPermissaoOuRedirecionar("integracoes:gerenciar:global");

  const unidades = await listarUnidadesParaEquipamentos();

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Equipamentos biométricos", href: "/equipamentos" },
          { label: "Novo" },
        ]}
      />

      <PageHeader
        icon={Cpu}
        titulo="Novo equipamento biométrico"
        descricao="Cadastre dados de conexão, protocolo, credenciais e NSR inicial de coleta."
        actions={
          <Link
            href="/equipamentos"
            className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-[var(--muted)]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar para listagem
          </Link>
        }
      />

      <EquipamentoBiometricoForm unidades={unidades} />
    </div>
  );
}
