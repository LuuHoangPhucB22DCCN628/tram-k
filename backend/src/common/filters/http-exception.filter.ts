import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";

import type { ApiErrorResponse } from "../interfaces/api-response.interface";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const payloadTooLarge = this.isPayloadTooLarge(exception);
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : payloadTooLarge
          ? HttpStatus.PAYLOAD_TOO_LARGE
          : HttpStatus.INTERNAL_SERVER_ERROR;
    const body: ApiErrorResponse = {
      success: false,
      error: {
        code: `HTTP_${status}`,
        message: payloadTooLarge
          ? "Ảnh hoặc dữ liệu gửi lên quá lớn."
          : this.getMessage(exception),
      },
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    const retryAfterSeconds = this.getRetryAfterSeconds(exception);
    if (retryAfterSeconds !== null)
      response.setHeader("Retry-After", retryAfterSeconds);

    response.status(status).json(body);
  }

  private isPayloadTooLarge(exception: unknown): boolean {
    return (
      typeof exception === "object" &&
      exception !== null &&
      "type" in exception &&
      exception.type === "entity.too.large"
    );
  }

  private getRetryAfterSeconds(exception: unknown): number | null {
    if (!(exception instanceof HttpException)) return null;
    const exceptionResponse = exception.getResponse();
    if (!exceptionResponse || typeof exceptionResponse !== "object")
      return null;
    const retryAfterSeconds =
      "retryAfterSeconds" in exceptionResponse
        ? exceptionResponse.retryAfterSeconds
        : null;
    return typeof retryAfterSeconds === "number" && retryAfterSeconds > 0
      ? Math.ceil(retryAfterSeconds)
      : null;
  }

  private getMessage(exception: unknown): string | readonly string[] {
    if (!(exception instanceof HttpException)) {
      return "Hệ thống đang gặp lỗi. Vui lòng thử lại sau.";
    }

    const exceptionResponse = exception.getResponse();
    if (typeof exceptionResponse === "string") return exceptionResponse;
    if (
      typeof exceptionResponse === "object" &&
      exceptionResponse !== null &&
      "message" in exceptionResponse
    ) {
      const message = exceptionResponse.message;
      if (typeof message === "string") return message;
      if (
        Array.isArray(message) &&
        message.every((item) => typeof item === "string")
      ) {
        return message;
      }
    }
    return exception.message;
  }
}
