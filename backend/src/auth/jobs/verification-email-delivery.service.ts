import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";

export interface VerificationEmailMessage {
  readonly recipient: string;
  readonly displayName: string;
  readonly token: string;
}

@Injectable()
export class VerificationEmailDeliveryService {
  private readonly logger = new Logger(VerificationEmailDeliveryService.name);
  private readonly mode: "log" | "webhook" | "smtp";
  private readonly publicWebUrl: string;
  private readonly webhookUrl?: string;
  private readonly webhookToken?: string;
  private readonly smtpHost?: string;
  private readonly smtpPort: number;
  private readonly smtpSecure: boolean;
  private readonly smtpUser?: string;
  private readonly smtpPass?: string;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.mode = config.get<"log" | "webhook" | "smtp">("EMAIL_DELIVERY_MODE", "log");
    this.publicWebUrl = config.get<string>(
      "PUBLIC_WEB_URL",
      "http://localhost:4201",
    );
    this.webhookUrl = config.get<string>("EMAIL_WEBHOOK_URL");
    this.webhookToken = config.get<string>("EMAIL_WEBHOOK_TOKEN");
    this.smtpHost = config.get<string>("SMTP_HOST");
    this.smtpPort = config.get<number>("SMTP_PORT", 465);
    this.smtpSecure = config.get<boolean>("SMTP_SECURE", true);
    this.smtpUser = config.get<string>("SMTP_USER");
    this.smtpPass = config.get<string>("SMTP_PASS");
    this.from = config.get<string>(
      "EMAIL_FROM",
      "Trạm K <no-reply@tramk.local>",
    );
  }

  async sendVerification(message: VerificationEmailMessage): Promise<void> {
    const verificationUrl = new URL("/xac-minh-email", this.publicWebUrl);
    verificationUrl.searchParams.set("token", message.token);
    const subject = "Xác minh tài khoản Trạm K";
    const text = [
      `Xin chào ${message.displayName},`,
      "Vui lòng xác minh tài khoản Trạm K trong vòng 24 giờ:",
      verificationUrl.toString(),
      "Nếu bạn không thực hiện đăng ký này, hãy bỏ qua email.",
    ].join("\n\n");

    await this.deliver(
      message,
      subject,
      text,
      this.verificationHtml(message, verificationUrl.toString()),
    );
  }

  async sendPasswordReset(message: VerificationEmailMessage): Promise<void> {
    const resetUrl = new URL("/dat-lai-mat-khau", this.publicWebUrl);
    resetUrl.searchParams.set("token", message.token);
    const subject = "Đặt lại mật khẩu Trạm K";
    const text = [
      `Xin chào ${message.displayName},`,
      "Bạn đã yêu cầu đặt lại mật khẩu Trạm K. Liên kết này có hiệu lực trong 30 phút:",
      resetUrl.toString(),
      "Nếu bạn không gửi yêu cầu này, hãy bỏ qua email.",
    ].join("\n\n");
    const html = `<p>Xin chào ${this.escapeHtml(message.displayName)},</p>
<p>Bạn đã yêu cầu đặt lại mật khẩu Trạm K. Liên kết này có hiệu lực trong 30 phút.</p>
<p><a href="${this.escapeHtml(resetUrl.toString())}">Đặt lại mật khẩu</a></p>
<p>Nếu bạn không gửi yêu cầu này, hãy bỏ qua email.</p>`;
    await this.deliver(message, subject, text, html);
  }

  async sendEmailChange(message: VerificationEmailMessage): Promise<void> {
    const verificationUrl = new URL("/xac-minh-email-moi", this.publicWebUrl);
    verificationUrl.searchParams.set("token", message.token);
    const subject = "Xác minh email mới của tài khoản Trạm K";
    const text = [
      `Xin chào ${message.displayName},`,
      "Bạn đã yêu cầu dùng địa chỉ này cho tài khoản Trạm K. Liên kết có hiệu lực trong 24 giờ:",
      verificationUrl.toString(),
      "Email hiện tại vẫn được giữ nguyên cho đến khi bạn mở liên kết này.",
      "Nếu bạn không gửi yêu cầu, hãy bỏ qua email.",
    ].join("\n\n");
    const html = `<p>Xin chào ${this.escapeHtml(message.displayName)},</p>
<p>Bạn đã yêu cầu dùng địa chỉ này cho tài khoản Trạm K. Liên kết có hiệu lực trong 24 giờ.</p>
<p><a href="${this.escapeHtml(verificationUrl.toString())}">Xác minh email mới</a></p>
<p>Email hiện tại vẫn được giữ nguyên cho đến khi bạn mở liên kết này.</p>
<p>Nếu bạn không gửi yêu cầu, hãy bỏ qua email.</p>`;
    await this.deliver(message, subject, text, html);
  }

  private async deliver(
    message: VerificationEmailMessage,
    subject: string,
    text: string,
    html: string,
  ): Promise<void> {
    if (this.mode === "log") {
      this.logger.log(
        `Email "${subject}" đã được xử lý cho ${this.maskEmail(message.recipient)}.`,
      );
      return;
    }
    if (this.mode === "smtp") {
      if (
        !this.smtpHost ||
        !this.smtpUser ||
        !this.smtpPass
      ) {
        throw new Error("SMTP configuration is incomplete");
      }
      const transporter = nodemailer.createTransport({
        host: this.smtpHost,
        port: this.smtpPort,
        secure: this.smtpSecure,
        auth: {
          user: this.smtpUser,
          pass: this.smtpPass,
        },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 10_000,
      });

      try {
        const result = await transporter.sendMail({
          from: this.from,
          to: message.recipient,
          subject,
          text,
          html,
        });

        if (result.accepted.length === 0 || result.rejected.length > 0) {
          throw new Error("SMTP server rejected the email.");
        }
      } finally {
        transporter.close();
      }
      return;
    }
    if (!this.webhookUrl)
      throw new Error("EMAIL_WEBHOOK_URL is not configured.");

    const response = await fetch(this.webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.webhookToken
          ? { authorization: `Bearer ${this.webhookToken}` }
          : {}),
      },
      body: JSON.stringify({
        from: this.from,
        to: message.recipient,
        subject,
        text,
        html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new BadGatewayException(
        `Email webhook returned HTTP ${response.status}.`,
      );
    }
  }

  private verificationHtml(
    message: VerificationEmailMessage,
    verificationUrl: string,
  ): string {
    const name = this.escapeHtml(message.displayName);
    const url = this.escapeHtml(verificationUrl);

    return `<!DOCTYPE html>
  <html lang="vi">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Xác minh tài khoản Trạm K</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td align="center" style="background-color:#2563eb;padding:32px 24px;">
                <div style="display:inline-block;background-color:#ffffff;color:#2563eb;font-size:24px;font-weight:bold;line-height:48px;width:48px;height:48px;border-radius:12px;">
                  T
                </div>
                <h1 style="margin:14px 0 0;color:#ffffff;font-size:26px;">Trạm K</h1>
                <p style="margin:8px 0 0;color:#dbeafe;font-size:14px;">Kết nối và đồng hành</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px;">
                <h2 style="margin:0 0 20px;font-size:22px;line-height:1.4;">Xác minh địa chỉ email</h2>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.8;">Xin chào <strong>${name}</strong>,</p>
                <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.8;">
                  Cảm ơn bạn đã đăng ký tài khoản Trạm K. Vui lòng xác minh địa chỉ email để hoàn tất quá trình đăng ký.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 24px;">
                  <tr>
                    <td align="center" bgcolor="#2563eb" style="border-radius:8px;">
                      <a href="${url}" target="_blank" style="display:inline-block;padding:15px 28px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;border-radius:8px;">
                        Xác minh tài khoản
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 12px;color:#64748b;font-size:13px;line-height:1.8;">
                  Liên kết này có hiệu lực trong <strong>24 giờ</strong>.
                </p>
                <p style="margin:0 0 8px;color:#64748b;font-size:13px;line-height:1.8;">
                  Nếu nút không hoạt động, hãy sao chép liên kết sau vào trình duyệt:
                </p>
                <p style="margin:0 0 24px;font-size:12px;line-height:1.8;overflow-wrap:anywhere;word-break:break-word;">
                  <a href="${url}" style="color:#2563eb;">${url}</a>
                </p>
                <div style="height:1px;background-color:#e2e8f0;margin:24px 0;"></div>
                <p style="margin:0;color:#64748b;font-size:13px;line-height:1.8;">
                  Nếu bạn không thực hiện đăng ký này, hãy bỏ qua email. Tài khoản sẽ không được xác minh nếu bạn không mở liên kết.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:20px 24px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0 0 6px;color:#64748b;font-size:12px;">Email tự động từ Trạm K</p>
                <p style="margin:0;color:#94a3b8;font-size:12px;">Vui lòng không trả lời email này.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
  }


  private escapeHtml(value: string): string {
    return value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[character]!,
    );
  }

  private maskEmail(email: string): string {
    const [local = "", domain = ""] = email.split("@");
    return `${local.slice(0, 2)}***@${domain}`;
  }
}
