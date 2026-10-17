import { modelosOrganizacionais } from "./modelos-organizacionais";

type Where = Record<string, unknown>;
export type ContextoVisibilidade = { unidadesOcultas: string[]; hoje: Date };

export function juntarWhere(original: unknown, restricao: Where): Where {
  const where = (original ?? {}) as Where;
  if (!Object.keys(restricao).length) return where;
  const existentes = where.AND === undefined ? [] : Array.isArray(where.AND) ? where.AND : [where.AND];
  // Chaves únicas devem continuar na raiz para findUnique do Prisma.
  return { ...where, AND: [...existentes, restricao] };
}

/** Status do próprio servidor é um filtro independente; aqui vale a organização. */
export function whereOrganizacaoVisivel(model: string, contexto: ContextoVisibilidade, visitados: string[] = []): Where {
  if (model === "Orgao") return { ativo: true };
  if (model === "UnidadeOrganizacional") return { ativo: true, orgao: { is: { ativo: true } }, ...(contexto.unidadesOcultas.length ? { id: { notIn: contexto.unidadesOcultas } } : {}) };
  if (model === "Servidor") return {
    orgao: { is: { ativo: true } },
    ...(contexto.unidadesOcultas.length ? { lotacoes: { none: {
      status: "ATIVO", dataInicio: { lte: contexto.hoje },
      OR: [{ dataFim: null }, { dataFim: { gte: contexto.hoje } }],
      unidadeId: { in: contexto.unidadesOcultas },
    } } } : {}),
  };
  if (visitados.includes(model)) return {};
  const definition = modelosOrganizacionais[model];
  const filtros = (definition?.owned ?? []).flatMap(field => {
    const relation = definition.relations[field];
    const where = whereOrganizacaoVisivel(relation.model, contexto, [...visitados, model]);
    if (!Object.keys(where).length) return [];
    return [relation.optional ? { OR: [{ [field]: { is: null } }, { [field]: { is: where } }] } : { [field]: { is: where } }];
  });
  return filtros.length ? { AND: filtros } : {};
}

/** Também restringe relações carregadas e suas contagens, antes da paginação. */
export function restringirConsultaOrganizacional(model: string, args: Where, contexto: ContextoVisibilidade, cadastro = false): Where {
  const restricao = cadastro && model === "Orgao" ? {} : cadastro && model === "UnidadeOrganizacional" ? {
    orgao: { is: { ativo: true } },
    ...(contexto.unidadesOcultas.length ? { OR: [{ unidadePaiId: null }, { unidadePaiId: { notIn: contexto.unidadesOcultas } }] } : {}),
  } : whereOrganizacaoVisivel(model, contexto);
  const result = { ...args, where: juntarWhere(args.where, restricao) };
  const relations = modelosOrganizacionais[model]?.relations ?? {};
  for (const key of ["select", "include"] as const) {
    const selection = args[key];
    if (!selection || typeof selection !== "object") continue;
    const scoped: Where = { ...selection as Where };
    for (const [field, value] of Object.entries(scoped)) {
      if (!value) continue;
      const relation = relations[field];
      if (relation) {
        const childArgs = value === true ? {} : value as Where;
        const child = restringirConsultaOrganizacional(relation.model, childArgs, contexto);
        // Prisma não aceita where no include de relação singular obrigatória.
        if (!relation.list) delete child.where;
        scoped[field] = Object.keys(child).length ? child : true;
      } else if (field === "_count") {
        const original = value === true ? { select: Object.fromEntries(Object.entries(relations).filter(([, r]) => r.list).map(([name]) => [name, true])) } : value as Where;
        const counts = { ...(original.select ?? {}) as Where };
        for (const [name, countArgs] of Object.entries(counts)) {
          const target = relations[name];
          if (!countArgs || !target) continue;
          const where = whereOrganizacaoVisivel(target.model, contexto);
          if (Object.keys(where).length) counts[name] = { ...(countArgs === true ? {} : countArgs as Where), where: juntarWhere(countArgs === true ? undefined : (countArgs as Where).where, where) };
        }
        scoped[field] = { ...original, select: counts };
      }
    }
    (result as Where)[key] = scoped;
  }
  return result;
}
