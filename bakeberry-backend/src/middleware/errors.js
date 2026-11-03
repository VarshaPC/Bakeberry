export class ApiError extends Error {
	constructor(status, code, message, details) {
		super(message);
		this.status = status;
		this.code = code;
		this.details = details;
	}
}

export function notFoundHandler(req, res, next) {
	next(new ApiError(404, "NOT_FOUND", `Route ${req.method} ${req.path} was not found`));
}

export function errorHandler(error, req, res, _next) {
	const status = error.status ?? (error.name === "ValidationError" ? 400 : 500);
	const code = error.code ?? (status === 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR");
	if (status >= 500) req.log?.error({ err: error }, "Request failed");
	res.status(status).json({ error: { code, message: status === 500 ? "An unexpected error occurred" : error.message, ...(error.details ? { details: error.details } : {}) } });
}