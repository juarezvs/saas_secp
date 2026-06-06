export class EnrollmentFacialError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "EnrollmentFacialError";
  }
}
