import ServidoresPage from "../servidores/page";

type PessoasTipoPageProps = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function EstagiariosPage({
  searchParams,
}: PessoasTipoPageProps) {
  const params = searchParams ? await searchParams : {};

  return ServidoresPage({
    searchParams: Promise.resolve({
      ...params,
      tipoUsuario: "ESTAGIARIO",
    }),
  });
}
