import { prisma } from "@/shared/infrastructure/database/prisma";
import { sanearMarcacoesIdClassAfdService } from "@/modules/marcacoes-brutas/application/services/sanear-marcacoes-idclass-afd.service";

type Args = {
  equipamento?: string;
  nsrInicial?: string;
  nsrFinal?: string;
  quantidade?: string;
  lotes?: string;
  apply?: boolean;
  reprocessar?: boolean;
};

function lerArgs(argv: string[]) {
  return argv.reduce<Args>((acc, arg) => {
    if (arg === "--apply") {
      acc.apply = true;
      return acc;
    }

    if (arg === "--reprocessar") {
      acc.reprocessar = true;
      return acc;
    }

    const match = arg.match(/^--([^=]+)=(.*)$/);

    if (!match) return acc;

    const chave = match[1].replace(/-([a-z])/g, (_, letra: string) =>
      letra.toUpperCase(),
    ) as keyof Args;

    acc[chave] = match[2] as never;
    return acc;
  }, {});
}

async function resolverEquipamento(identificador: string) {
  return prisma.equipamentoBiometrico.findFirst({
    where: {
      OR: [
        {
          id: identificador,
        },
        {
          codigo: identificador,
        },
      ],
    },
    select: {
      id: true,
      codigo: true,
      nome: true,
    },
  });
}

async function main() {
  const args = lerArgs(process.argv.slice(2));

  if (!args.equipamento) {
    throw new Error(
      "Informe --equipamento=<id-ou-codigo>. Exemplo: npm run sanear:marcacoes-idclass-afd -- --equipamento=SJMA_ControlID_idClass_Bio --nsr-inicial=1",
    );
  }

  const equipamento = await resolverEquipamento(args.equipamento);

  if (!equipamento) {
    throw new Error(`Equipamento nao encontrado: ${args.equipamento}.`);
  }

  const resultado = await sanearMarcacoesIdClassAfdService({
    equipamentoId: equipamento.id,
    nsrInicial: args.nsrInicial ?? 1,
    nsrFinal: args.nsrFinal,
    quantidadePorLote: args.quantidade ? Number(args.quantidade) : undefined,
    limiteLotes: args.lotes ? Number(args.lotes) : undefined,
    aplicar: args.apply,
    reprocessar: args.reprocessar,
  });

  console.log(
    JSON.stringify(
      {
        equipamento,
        aviso: args.apply
          ? "ALTERACOES APLICADAS."
          : "SIMULACAO: nenhuma marcacao bruta foi alterada. Use --apply para aplicar.",
        resultado,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
