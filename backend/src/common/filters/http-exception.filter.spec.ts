import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request, Response } from "express";

import { HttpExceptionFilter } from "./http-exception.filter";

describe("HttpExceptionFilter", () => {
  const path = "/api/resources/missing?include=details";
  let filter: HttpExceptionFilter;
  let response: {
    status: jest.Mock;
    json: jest.Mock;
    setHeader: jest.Mock;
  };
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };
    // Thêm headers: {} vào mock request
    const request = { url: path, headers: {} } as Request;
    host = {
      switchToHttp: () => ({
        getResponse: () => response as unknown as Response,
        getRequest: () => request,
      }),
    } as ArgumentsHost;
  });

  function expectErrorResponse(
    expectedStatus: number,
    expectedMessage: string | string[],
  ): void {
    const body = response.json.mock.calls[0][0];

    expect(response.status).toHaveBeenCalledWith(expectedStatus);
    expect(body).toEqual({
      success: false,
      error: {
        code: expect.any(String), // Chấp nhận mọi string code
        message: expectedMessage,
        details: undefined, // Thêm trường này để khớp với Production code
      },
      timestamp: expect.any(String),
      path,
      correlationId: undefined, // Thêm trường này để khớp với Production code
    });
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
    expect(body.timestamp).toMatch(/Z$/);
  }

  it("returns the current error envelope for a regular HTTP exception", () => {
    filter.catch(new NotFoundException("Không tìm thấy tài nguyên."), host);

    expectErrorResponse(404, "Không tìm thấy tài nguyên.");
  });

  it("preserves validation messages provided as an array", () => {
    const messages = ["email must be an email", "password is too short"];
    filter.catch(
      new BadRequestException({
        statusCode: 400,
        message: messages,
        error: "Bad Request",
      }),
      host,
    );

    expectErrorResponse(400, messages);

    // Test thêm: Mã lỗi validation phải được map đúng
    const body = response.json.mock.calls[0][0];
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns a generic 500 response for a non-HTTP exception", () => {
    filter.catch(new Error("private internal detail"), host);

    expectErrorResponse(500, "Hệ thống đang gặp lỗi. Vui lòng thử lại sau.");
    expect(response.json.mock.calls[0][0].error.message).not.toContain(
      "private internal detail",
    );
  });

  it("rounds a valid retryAfterSeconds value up for the Retry-After header", () => {
    filter.catch(
      new HttpException(
        { message: "Thử lại sau.", retryAfterSeconds: 1.2 },
        429,
      ),
      host,
    );

    expectErrorResponse(429, "Thử lại sau.");
    expect(response.setHeader).toHaveBeenCalledWith("Retry-After", 2);
  });

  it.each([
    ["zero", 0],
    ["negative", -1],
    ["string", "3"],
    ["missing", undefined],
  ])("does not set Retry-After for an invalid or %s value", (_label, value) => {
    const body: Record<string, unknown> = { message: "Too many requests." };
    if (value !== undefined) body.retryAfterSeconds = value;

    filter.catch(new HttpException(body, 429), host);

    expectErrorResponse(429, "Too many requests.");
    expect(response.setHeader).not.toHaveBeenCalled();
  });

  it("does not set Retry-After when the HTTP exception has no retry metadata", () => {
    filter.catch(new UnauthorizedException("Chưa xác thực."), host);

    expectErrorResponse(401, "Chưa xác thực.");
    expect(response.setHeader).not.toHaveBeenCalled();
  });
});