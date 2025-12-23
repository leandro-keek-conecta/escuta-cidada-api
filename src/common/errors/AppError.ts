export class AppError extends Error {
  public status: number;
  public code: string;
  public details?: unknown;
  public expose: boolean;

  // Backwards-compatible constructor: supports (message, status?, details?) or options object
  constructor(
    message: string,
    optsOrStatus: { status?: number; code?: string; details?: unknown; expose?: boolean } | number | undefined = undefined,
    legacyDetails?: unknown
  ) {
    super(message);
    this.name = 'AppError';

    let status: number | undefined;
    let code: string | undefined;
    let details: unknown | undefined;
    let expose: boolean | undefined;

    if (typeof optsOrStatus === 'number') {
      status = optsOrStatus;
      details = legacyDetails;
    } else if (typeof optsOrStatus === 'object' && optsOrStatus !== null) {
      status = optsOrStatus.status;
      code = optsOrStatus.code;
      details = optsOrStatus.details;
      expose = optsOrStatus.expose;
    }

    this.status = status ?? 500;
    this.code = code ?? this.defaultCodeForStatus(this.status);
    this.details = details;
    this.expose = expose ?? this.status < 500;
    Error.captureStackTrace?.(this, this.constructor);
  }

  // Provide statusCode for compatibility with previous code
  get statusCode(): number {
    return this.status;
  }

  private defaultCodeForStatus(status: number): string {
    switch (status) {
      case 400: return 'BAD_REQUEST';
      case 401: return 'UNAUTHORIZED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 409: return 'CONFLICT';
      case 422: return 'UNPROCESSABLE_ENTITY';
      default: return 'INTERNAL_ERROR';
    }
  }

  static badRequest(msg: string, details?: unknown) {
    return new AppError(msg, { status: 400, code: 'BAD_REQUEST', details, expose: true });
  }
  static unauthorized(msg = 'Unauthorized') {
    return new AppError(msg, { status: 401, code: 'UNAUTHORIZED', expose: true });
  }
  static forbidden(msg = 'Forbidden') {
    return new AppError(msg, { status: 403, code: 'FORBIDDEN', expose: true });
  }
  static notFound(msg = 'Not Found') {
    return new AppError(msg, { status: 404, code: 'NOT_FOUND', expose: true });
  }
  static conflict(msg = 'Conflict', details?: unknown) {
    return new AppError(msg, { status: 409, code: 'CONFLICT', details, expose: true });
  }
}
export default AppError;
