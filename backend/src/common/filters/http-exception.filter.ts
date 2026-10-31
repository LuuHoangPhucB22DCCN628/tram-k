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
    const correlationId = (request.headers["x-correlation-id"] as string) || undefined;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;
    let message: string | string[] = "Hệ thống đang gặp lỗi. Vui lòng thử lại sau."
    let code = `Http_${status}`;
    let details = undefined;

    if (exceptionResponse) {
      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === "object") {
        const resp = exceptionResponse as any;
        if (resp.message) message = resp.message;
        if (resp.error) code = resp.error;
        if (resp.details) details = resp.details;

        if (Array.isArray(resp.message) && status === 400) {
          code = "VALIDATION_ERROR";
        }
      }
    }

    if (payloadTooLarge) {
      message = "Ảnh hoặc dữ liệu gửi lên quá lớn.";
      code = `HTTP_${HttpStatus.PAYLOAD_TOO_LARGE}`;
    }

    if (status === 500) {
      console.error(`[${correlationId || "NO_CORR_ID"}]`, exception);
      message = "Hệ thống đang gặp lỗi. Vui lòng thử lại sau.";
    }

    const body: ApiErrorResponse = {
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId,
    };

    const retryAfterSeconds = this.getRetryAfterSeconds(exception);
    if (retryAfterSeconds !== null) response.setHeader("Retry-After", retryAfterSeconds);

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
