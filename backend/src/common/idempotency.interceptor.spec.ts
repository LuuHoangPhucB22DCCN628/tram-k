import { Test, TestingModule } from "@nestjs/testing";
import { CallHandler, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { of } from "rxjs";

import { IdempotencyInterceptor } from "./idempotency.interceptor";
import { IdempotencyService } from "./idempotency.service";
import { IdempotencyStatus } from "@prisma/client";

describe("IdempotencyInterceptor", () => {
  let interceptor: IdempotencyInterceptor;
  let idempotencyService: any;
  let reflector: any;

  beforeEach(async () => {
    idempotencyService = {
      hashPayload: jest.fn().mockReturnValue("hash-a"),
      claim: jest.fn(),
      complete: jest.fn(),
      remove: jest.fn(),
    };
    reflector = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyInterceptor,
        { provide: IdempotencyService, useValue: idempotencyService },
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    interceptor = module.get<IdempotencyInterceptor>(IdempotencyInterceptor);
  });

  const createContext = (headers: any = {}, user: any = null): ExecutionContext => {
    const response = { status: jest.fn(), statusCode: 201 }; // <-- THÊM status: jest.fn()
    return {
      getHandler: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ headers, user, ip: "127.0.0.1", params: {}, query: {}, body: {} }),
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
  };

  it("bỏ qua nếu không có decorator", async () => {
    reflector.get.mockReturnValue(undefined);
    const next: CallHandler = { handle: jest.fn().mockReturnValue(of("ok")) };
    const result$ = await interceptor.intercept(createContext(), next);
    result$.subscribe((val) => expect(val).toBe("ok"));
  });

  it("trả về cache nếu đã COMPLETED", async () => {
    reflector.get.mockReturnValue("OP");
    idempotencyService.claim.mockResolvedValue({ status: IdempotencyStatus.COMPLETED, responseStatus: 201, responseBody: { id: "1" } });

    const next: CallHandler = { handle: jest.fn() };
    const result$ = await interceptor.intercept(createContext({ "x-idempotency-key": "k" }), next);

    result$.subscribe((val) => expect(val).toEqual({ id: "1" }));
  });

  it("xử lý và gọi complete() nếu là request mới", async () => {
    reflector.get.mockReturnValue("OP");
    idempotencyService.claim.mockResolvedValue(null); // Claim thành công
    idempotencyService.complete.mockResolvedValue(undefined);

    const next: CallHandler = { handle: jest.fn().mockReturnValue(of({ id: "new" })) };
    const result$ = await interceptor.intercept(createContext({ "x-idempotency-key": "k" }, { id: "u1" }), next);

    result$.subscribe(async (val) => {
      expect(val).toEqual({ id: "new" });
      expect(idempotencyService.complete).toHaveBeenCalled();
    });
  });
});