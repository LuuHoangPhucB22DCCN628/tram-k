import { Test, TestingModule } from "@nestjs/testing";
import { CallHandler, ExecutionContext, BadRequestException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { of } from "rxjs";

import { IdempotencyInterceptor } from "./idempotency.interceptor";
import { IdempotencyService } from "./idempotency.service";

describe("IdempotencyInterceptor", () => {
  let interceptor: IdempotencyInterceptor;
  let idempotencyService: IdempotencyService;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyInterceptor,
        {
          provide: IdempotencyService,
          useValue: {
            hashPayload: jest.fn().mockReturnValue("hash-a"),
            validateOrThrow: jest.fn(),
            saveRecord: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    interceptor = module.get<IdempotencyInterceptor>(IdempotencyInterceptor);
    idempotencyService = module.get<IdempotencyService>(IdempotencyService);
    reflector = module.get<Reflector>(Reflector);
  });

  const createContext = (headers: any = {}, user: any = null): ExecutionContext => ({
    getHandler: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ headers, user, ip: "127.0.0.1" }),
      getResponse: () => ({
        statusCode: 201,
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      }),
    }),
  } as unknown as ExecutionContext);

  it("bỏ qua nếu route không có decorator @Idempotent", async () => {
    jest.spyOn(reflector, "get").mockReturnValue(undefined);
    const next: CallHandler = { handle: jest.fn().mockReturnValue(of("ok")) };

    const result$ = await interceptor.intercept(createContext(), next);
    result$.subscribe((val) => expect(val).toBe("ok"));
  });

  it("phải ném BadRequestException nếu thiếu header x-idempotency-key", async () => {
    jest.spyOn(reflector, "get").mockReturnValue("CREATE_POST");
    const next: CallHandler = { handle: jest.fn() };
    const context = createContext({}); // Không có header

    await expect(interceptor.intercept(context, next)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("trả về kết quả cache nếu key đã tồn tại", async () => {
    jest.spyOn(reflector, "get").mockReturnValue("CREATE_POST");
    const next: CallHandler = { handle: jest.fn() };
    const context = createContext({ "x-idempotency-key": "k1" }, { id: "user-1" });

    jest.spyOn(idempotencyService, "validateOrThrow").mockResolvedValue({
      responseBody: { id: "post-1" },
      responseStatus: 201,
    } as any);

    const result$ = await interceptor.intercept(context, next);
    result$.subscribe((val) => expect(val).toEqual({ id: "post-1" }));
  });

  it("xử lý bình thường và lưu DB nếu là request mới", async () => {
    jest.spyOn(reflector, "get").mockReturnValue("CREATE_POST");
    const next: CallHandler = { handle: jest.fn().mockReturnValue(of({ id: "new-post" })) };
    const context = createContext({ "x-idempotency-key": "k2" }, { id: "user-1" });

    jest.spyOn(idempotencyService, "validateOrThrow").mockResolvedValue(null);

    const result$ = await interceptor.intercept(context, next);

    result$.subscribe(async (val) => {
      expect(val).toEqual({ id: "new-post" });
      expect(idempotencyService.saveRecord).toHaveBeenCalled();
    });
  });
});