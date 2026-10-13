import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface VerificationEmailMessage {
  readonly recipient: string;
  readonly displayName: string;
  readonly token: string;
}

@Injectable()
export class VerificationEmailDeliveryService {
  private readonly logger = new Logger(VerificationEmailDeliveryService.name);
  private readonly mode: "log" | "webhook";
  private readonly publicWebUrl: string;
  private readonly webhookUrl?: string;
  private readonly webhookToken?: string;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.mode = config.get<"log" | "webhook">("EMAIL_DELIVERY_MODE", "log");
    this.publicWebUrl = config.get<string>(
      "PUBLIC_WEB_URL",
      "http://localhost:4201",
    );
    this.webhookUrl = config.get<string>("EMAIL_WEBHOOK_URL");
    this.webhookToken = config.get<string>("EMAIL_WEBHOOK_TOKEN");
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
    return `<p>Xin chào ${this.escapeHtml(message.displayName)},</p>
<p>Vui lòng xác minh tài khoản Trạm K trong vòng 24 giờ.</p>
<p><a href="${this.escapeHtml(verificationUrl)}">Xác minh tài khoản</a></p>
<p>Nếu bạn không thực hiện đăng ký này, hãy bỏ qua email.</p>`;
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
