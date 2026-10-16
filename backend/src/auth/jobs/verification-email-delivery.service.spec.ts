import { BadGatewayException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AddressInfo } from "node:net";
import { createServer } from "node:http";

import { VerificationEmailDeliveryService } from "./verification-email-delivery.service";


jest.mock("nodemailer", () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

import nodemailer from "nodemailer";

const message = {
  recipient: "member@example.com",
  displayName: "Nguyễn Minh An",
  token: "token with / special?characters",
};

function createConfig(
  overrides: Record<string, unknown> = {},
): ConfigService {
  const values: Record<string, unknown> = {
    EMAIL_DELIVERY_MODE: "webhook",
    PUBLIC_WEB_URL: "http://localhost:4201",
    EMAIL_WEBHOOK_URL: "https://email-gateway.example.test/send",
    EMAIL_WEBHOOK_TOKEN: "private-webhook-token",
    EMAIL_FROM: "Trạm K <no-reply@tramk.local>",
    ...overrides,
  };

  return {
    get: jest.fn((key: string, fallback?: unknown) => values[key] ?? fallback),
  } as unknown as ConfigService;
}

function successfulResponse(): Response {
  return { ok: true, status: 202 } as Response;
}

describe("VerificationEmailDeliveryService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("logs a masked recipient without calling a provider in log mode", async () => {
    const fetchSpy = jest.spyOn(global, "fetch");
    const logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation();
    const service = new VerificationEmailDeliveryService(
      createConfig({ EMAIL_DELIVERY_MODE: "log" }),
    );

    await service.sendVerification(message);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      'Email "Xác minh tài khoản Trạm K" đã được xử lý cho me***@example.com.',
    );
  });

  it("sends verification email through SMTP and closes the transporter", async () => {
    const sendMail = jest.fn().mockResolvedValue({
      accepted: ["recipient@example.com"],
      rejected: [],
    });
    const close = jest.fn();

    jest.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail,
      close,
    } as never);

    const service = new VerificationEmailDeliveryService(
      createConfig({
        EMAIL_DELIVERY_MODE: "smtp",
        SMTP_HOST: "smtp.gmail.com",
        SMTP_PORT: 465,
        SMTP_SECURE: true,
        SMTP_USER: "sender@gmail.com",
        SMTP_PASS: "test-app-password",
      }),
    );

    await service.sendVerification(message);

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: "sender@gmail.com",
          pass: "test-app-password",
        },
      }),
    );

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: message.recipient,
        subject: "Xác minh tài khoản Trạm K",
        text: expect.stringContaining("/xac-minh-email?token="),
        html: expect.stringContaining("Xác minh tài khoản"),
      }),
    );

    expect(close).toHaveBeenCalledTimes(1);
  });

  it("propagates SMTP errors and closes the transporter", async () => {
    const sendMail = jest
      .fn()
      .mockRejectedValue(new Error("SMTP connection failed"));
    const close = jest.fn();

    jest.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail,
      close,
    } as never);

    const service = new VerificationEmailDeliveryService(
      createConfig({
        EMAIL_DELIVERY_MODE: "smtp",
        SMTP_HOST: "smtp.gmail.com",
        SMTP_PORT: 465,
        SMTP_SECURE: true,
        SMTP_USER: "sender@gmail.com",
        SMTP_PASS: "test-app-password",
      }),
    );

    await expect(service.sendVerification(message)).rejects.toThrow(
      "SMTP connection failed",
    );

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("rejects an SMTP recipient rejected by the server and closes the transporter", async () => {
    const sendMail = jest.fn().mockResolvedValue({
      accepted: [],
      rejected: [message.recipient],
    });
    const close = jest.fn();

    jest.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail,
      close,
    } as never);

    const service = new VerificationEmailDeliveryService(
      createConfig({
        EMAIL_DELIVERY_MODE: "smtp",
        SMTP_HOST: "smtp.gmail.com",
        SMTP_PORT: 465,
        SMTP_SECURE: true,
        SMTP_USER: "sender@gmail.com",
        SMTP_PASS: "test-app-password",
      }),
    );

    await expect(service.sendVerification(message)).rejects.toThrow(
      "SMTP server rejected the email.",
    );

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("sends a verification email through the configured webhook", async () => {
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(successfulResponse());
    const service = new VerificationEmailDeliveryService(createConfig());

    await service.sendVerification(message);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://email-gateway.example.test/send");
    expect(init).toMatchObject({
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer private-webhook-token",
      },
    });
    const body = JSON.parse(String(init?.body)) as Record<string, string>;
    expect(body).toMatchObject({
      from: "Trạm K <no-reply@tramk.local>",
      to: message.recipient,
      subject: "Xác minh tài khoản Trạm K",
    });
    expect(body.text).toContain(
      "http://localhost:4201/xac-minh-email?token=token+with+%2F+special%3Fcharacters",
    );
    expect(body.html).toContain("Xác minh tài khoản");
  });

  it("delivers a real HTTP request to a local webhook receiver", async () => {
    let receivedBody = "";
    let receivedAuthorization: string | undefined;
    const server = createServer((request, response) => {
      receivedAuthorization = request.headers.authorization;
      request.setEncoding("utf8");
      request.on("data", (chunk: string) => {
        receivedBody += chunk;
      });
      request.on("end", () => {
        response.writeHead(202).end();
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );

    try {
      const address = server.address() as AddressInfo;
      const service = new VerificationEmailDeliveryService(
        createConfig({
          EMAIL_WEBHOOK_URL: `http://127.0.0.1:${address.port}/email`,
        }),
      );

      await service.sendEmailChange(message);

      expect(receivedAuthorization).toBe("Bearer private-webhook-token");
      expect(JSON.parse(receivedBody)).toMatchObject({
        from: "Trạm K <no-reply@tramk.local>",
        to: message.recipient,
        subject: "Xác minh email mới của tài khoản Trạm K",
      });
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("sends the two-step email-change link and keeps the old-email notice", async () => {
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(successfulResponse());
    const service = new VerificationEmailDeliveryService(createConfig());

    await service.sendEmailChange(message);

    const [, init] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse(String(init?.body)) as Record<string, string>;
    expect(body.subject).toBe("Xác minh email mới của tài khoản Trạm K");
    expect(body.text).toContain(
      "http://localhost:4201/xac-minh-email-moi?token=token+with+%2F+special%3Fcharacters",
    );
    expect(body.text).toContain(
      "Email hiện tại vẫn được giữ nguyên cho đến khi bạn mở liên kết này.",
    );
    expect(body.html).toContain("Xác minh email mới");
  });

  it("sends a password-reset link through the same provider contract", async () => {
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(successfulResponse());
    const service = new VerificationEmailDeliveryService(createConfig());

    await service.sendPasswordReset(message);

    const [, init] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse(String(init?.body)) as Record<string, string>;
    expect(body.subject).toBe("Đặt lại mật khẩu Trạm K");
    expect(body.text).toContain(
      "http://localhost:4201/dat-lai-mat-khau?token=token+with+%2F+special%3Fcharacters",
    );
  });

  it("fails clearly when webhook mode has no provider URL", async () => {
    const service = new VerificationEmailDeliveryService(
      createConfig({ EMAIL_WEBHOOK_URL: undefined }),
    );

    await expect(service.sendVerification(message)).rejects.toThrow(
      "EMAIL_WEBHOOK_URL is not configured.",
    );
  });

  it("turns a non-success provider response into a retryable delivery error", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: false, status: 503 } as Response);
    const service = new VerificationEmailDeliveryService(createConfig());

    await expect(service.sendVerification(message)).rejects.toThrow(
      BadGatewayException,
    );
    await expect(service.sendVerification(message)).rejects.toThrow(
      "Email webhook returned HTTP 503.",
    );
  });
});
