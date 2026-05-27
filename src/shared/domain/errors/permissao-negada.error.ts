export class PermissaoNegadaError extends Error {
  constructor(
    public readonly permissaoNecessaria?: string,
    message = "Você não possui permissão para acessar este recurso.",
  ) {
    super(message);
    this.name = "PermissaoNegadaError";
  }
}
