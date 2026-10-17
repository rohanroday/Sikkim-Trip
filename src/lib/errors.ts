export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, "validation_error", 400);
  }
}
export class UnauthorizedError extends DomainError {
  constructor(message = "Please sign in again.") {
    super(message, "unauthorized", 401);
  }
}
export class ForbiddenError extends DomainError {
  constructor(message = "Not allowed.") {
    super(message, "forbidden", 403);
  }
}
export class NotFoundError extends DomainError {
  constructor(message = "Not found.") {
    super(message, "not_found", 404);
  }
}
export class HoldConflictError extends DomainError {
  constructor(message = "Those dates were just taken. Please pick other dates.") {
    super(message, "hold_conflict", 409);
  }
}
export class InvalidTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super(`Booking cannot move from ${from} to ${to}.`, "invalid_transition", 409);
  }
}
export class RouteClosedError extends DomainError {
  constructor(route: string) {
    super(`The ${route} route is closed on those dates.`, "route_closed", 409);
  }
}
export class RateLimitError extends DomainError {
  constructor(message = "Too many tries. Please wait a few minutes.") {
    super(message, "rate_limited", 429);
  }
}
export class ConfigError extends DomainError {
  constructor(message: string) {
    super(message, "config_error", 500);
  }
}
