import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { SearchService } from "../search/search.service";
import { AskAiAssistantDto } from "./dto/ask-ai-assistant.dto";
import { AiAssistantReply, AiAssistantSource } from "./ai-assistant.types";

interface OpenAiOutputContent {
  readonly type?: string;
  readonly text?: string;
}

interface OpenAiOutputItem {
  readonly content?: readonly OpenAiOutputContent[];
}

interface OpenAiResponse {
  readonly output?: readonly OpenAiOutputItem[];
}

type AiAssistantIntent =
  | "TREATMENT_PREPARATION"
  | "DIAGNOSIS"
  | "NUTRITION"
  | "MENTAL_HEALTH"
  | "SUPPORT_PROGRAM"
  | "GENERAL";

const DISCLAIMER =
  "Trợ lý Trạm K chỉ cung cấp thông tin tham khảo, không thay thế chẩn đoán, điều trị hoặc tư vấn trực tiếp từ bác sĩ.";

const DEFAULT_SUGGESTIONS = [
  "Tôi vừa nhận chẩn đoán, nên chuẩn bị gì?",
  "Ăn uống thế nào trong thời gian hóa trị?",
  "Tôi đang rất lo lắng, làm sao để bình tĩnh hơn?",
  "Tìm chương trình hỗ trợ phù hợp với tôi",
] as const;

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly searchService: SearchService,
  ) {}

  async ask(input: AskAiAssistantDto): Promise<AiAssistantReply> {
    const message = input.message.trim();
    if (this.isUrgent(message)) return this.urgentReply();

    const intent = this.detectIntent(message);
    const sources = await this.findSources(message, intent);
    if (this.config.get<string>("AI_PROVIDER") === "openai") {
      const openAiReply = await this.askOpenAi(
        { ...input, message },
        sources,
        intent,
      );
      if (openAiReply) return openAiReply;
    }

    return this.localReply(sources, intent);
  }

  private async findSources(
    message: string,
    intent: AiAssistantIntent,
  ): Promise<AiAssistantSource[]> {
    for (const query of this.sourceQueries(message, intent)) {
      try {
        const result = await this.searchService.search({
          q: query,
          page: 1,
          pageSize: 4,
        });
        if (result.items.length) {
          return result.items.map(({ title, link, type }) => ({
            title,
            link,
            type,
          }));
        }
      } catch {
        return [];
      }
    }
    return [];
  }

  private async askOpenAi(
    input: AskAiAssistantDto,
    sources: readonly AiAssistantSource[],
    intent: AiAssistantIntent,
  ): Promise<AiAssistantReply | null> {
    const apiKey = this.config.get<string>("OPENAI_API_KEY")?.trim();
    if (!apiKey) return null;

    const sourceContext = sources.length
      ? sources
          .map(
            (source, index) => `${index + 1}. ${source.title} — ${source.link}`,
          )
          .join("\n")
      : "Chưa có tài liệu nội bộ phù hợp.";
    const history = input.history
      .slice(-8)
      .map(
        (item) =>
          `${item.role === "user" ? "Người dùng" : "Trợ lý"}: ${item.content}`,
      )
      .join("\n");

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.get<string>("OPENAI_MODEL") ?? "gpt-6-luna",
          store: false,
          max_output_tokens: 600,
          reasoning: { effort: "none" },
          instructions: [
            "Bạn là Trợ lý Trạm K, trả lời bằng tiếng Việt, ấm áp, ngắn gọn và dễ hiểu.",
            "Bạn hỗ trợ bệnh nhân ung thư và người thân nhưng không được chẩn đoán, kê đơn, đổi liều hoặc khẳng định tiên lượng.",
            "Khi thiếu dữ kiện, hãy khuyên người dùng hỏi bác sĩ điều trị. Không bịa nguồn hoặc số liệu.",
            `Mục đích chính của câu hỏi đã được nhận diện là: ${this.intentLabel(intent)}.`,
            "Hãy trả lời trực tiếp mục đích chính này; không đổi sang chủ đề khác chỉ vì một từ khóa hoặc nguồn tham khảo phụ.",
            "Chỉ nhắc đến nguồn Trạm K được cung cấp bên dưới khi thực sự liên quan.",
            `Nguồn Trạm K:\n${sourceContext}`,
          ].join("\n"),
          input: `${history ? `${history}\n` : ""}Người dùng: ${input.message}`,
        }),
      });
      if (!response.ok) {
        this.logger.warn(
          `OpenAI request failed with status ${response.status}; using local reply.`,
        );
        return null;
      }

      const payload = (await response.json()) as OpenAiResponse;
      const answer = payload.output
        ?.flatMap((item) => item.content ?? [])
        .filter(
          (content) =>
            content.type === "output_text" && typeof content.text === "string",
        )
        .map((content) => content.text?.trim())
        .filter((text): text is string => Boolean(text))
        .join("\n\n");
      if (!answer) return null;

      return {
        answer,
        mode: "OPENAI",
        disclaimer: DISCLAIMER,
        sources,
        suggestedQuestions: DEFAULT_SUGGESTIONS,
      };
    } catch (error) {
      this.logger.warn(
        `OpenAI request could not be completed; using local reply (${error instanceof Error ? error.name : "unknown error"}).`,
      );
      return null;
    }
  }

  private localReply(
    sources: readonly AiAssistantSource[],
    intent: AiAssistantIntent,
  ): AiAssistantReply {
    let answer: string;

    if (intent === "TREATMENT_PREPARATION") {
      answer =
        "Trước buổi hóa trị đầu tiên, bạn nên xác nhận giờ đến, địa điểm, việc có cần nhịn ăn hay không và các xét nghiệm phải hoàn thành với cơ sở điều trị. Hãy mang giấy tờ khám bệnh, danh sách thuốc và thực phẩm bổ sung đang dùng, ghi sẵn câu hỏi cho bác sĩ, mặc đồ thoải mái và sắp xếp người đi cùng hoặc phương án về nhà. Chỉ ăn nhẹ, uống nước hay dùng thuốc trước buổi truyền theo đúng hướng dẫn của đội ngũ điều trị; không tự ngừng hoặc thêm thuốc.";
    } else if (intent === "DIAGNOSIS") {
      answer =
        "Việc nhận một chẩn đoán hoặc kết quả mới có thể khiến bạn choáng ngợp. Bạn có thể ghi lại tên bệnh, giai đoạn (nếu đã xác định), mục tiêu điều trị và các câu hỏi muốn trao đổi trong lần hẹn tiếp theo. Hãy nhờ bác sĩ giải thích những lựa chọn, lợi ích, tác dụng không mong muốn và dấu hiệu cần liên hệ bệnh viện. Đừng tự thay đổi thuốc hoặc lịch điều trị.";
    } else if (intent === "NUTRITION") {
      answer =
        "Trong thời gian điều trị, hãy ưu tiên bữa nhỏ, thực phẩm dễ ăn, đủ nước và nguồn đạm phù hợp với hướng dẫn của đội ngũ điều trị. Khả năng dung nạp của mỗi người khác nhau; nếu nôn kéo dài, không uống được, sụt cân nhanh hoặc có chế độ kiêng đặc biệt, hãy liên hệ bác sĩ hay chuyên gia dinh dưỡng lâm sàng. Không nên dùng thực phẩm bổ sung hoặc thuốc nam khi chưa hỏi bác sĩ.";
    } else if (intent === "MENTAL_HEALTH") {
      answer =
        "Cảm giác lo lắng trong hành trình điều trị là điều dễ hiểu. Trước mắt, bạn có thể thử thở chậm, đặt chân vững trên sàn và nói chuyện với một người mình tin cậy. Nếu cảm xúc kéo dài, ảnh hưởng giấc ngủ hoặc sinh hoạt, hãy chia sẻ với đội ngũ điều trị hoặc chuyên gia tâm lý. Bạn không cần phải tự chịu đựng một mình.";
    } else if (intent === "SUPPORT_PROGRAM") {
      answer =
        "Bạn có thể xem các chương trình đã được Trạm K công khai, lọc theo tỉnh/thành và mở từng chương trình để kiểm tra đối tượng, thời gian, số suất và cách đăng ký. Hãy chuẩn bị thông tin liên hệ và giấy tờ mà chương trình yêu cầu; không gửi dữ liệu y tế nhạy cảm qua kênh không chính thức.";
    } else {
      answer =
        "Tôi đã nhận được câu hỏi của bạn. Để hỗ trợ sát hơn, bạn có thể cho biết bạn đang cần thông tin về điều trị, dinh dưỡng, tinh thần hay chương trình hỗ trợ. Với các quyết định y khoa, hãy luôn xác nhận lại cùng bác sĩ đang điều trị vì họ có đầy đủ hồ sơ của bạn.";
    }

    return {
      answer,
      mode: "LOCAL",
      disclaimer: DISCLAIMER,
      sources: sources.length ? sources : this.fallbackSources(intent),
      suggestedQuestions: DEFAULT_SUGGESTIONS,
    };
  }

  private urgentReply(): AiAssistantReply {
    return {
      answer:
        "Những gì bạn mô tả có thể cần được hỗ trợ ngay. Hãy gọi dịch vụ cấp cứu tại nơi bạn đang ở hoặc đến cơ sở cấp cứu gần nhất. Nếu có thể, nhờ một người tin cậy ở bên và không tự lái xe. Nếu bạn đang nghĩ đến việc làm hại bản thân, hãy tránh ở một mình và liên hệ ngay với người thân, nhân viên y tế hoặc dịch vụ khẩn cấp địa phương.",
      mode: "SAFETY",
      disclaimer: DISCLAIMER,
      sources: [],
      suggestedQuestions: [],
    };
  }

  private isUrgent(message: string): boolean {
    return /(tu tu|tu sat|lam hai ban than|khong muon song|kho tho du doi|dau nguc du doi|ngat xiu|bat tinh|chay mau khong cam|co giat)/.test(
      this.normalize(message),
    );
  }

  private detectIntent(message: string): AiAssistantIntent {
    const normalized = this.normalize(message);
    if (/(ho tro|chuong trinh|quyen gop|chi phi|tu thien)/.test(normalized)) {
      return "SUPPORT_PROGRAM";
    }
    if (/(lo lang|so hai|mat ngu|tam ly|buon|co don)/.test(normalized)) {
      return "MENTAL_HEALTH";
    }
    if (
      /(hoa tri|xa tri|phau thuat)/.test(normalized) &&
      /(chuan bi|truoc|buoi|lan dau|dau tien|mang gi|nen lam|can lam)/.test(
        normalized,
      )
    ) {
      return "TREATMENT_PREPARATION";
    }
    if (/(an uong|dinh duong|buon non|chan an|thuc pham)/.test(normalized)) {
      return "NUTRITION";
    }
    if (
      /(chan doan|ket qua|ung thu|dieu tri|hoa tri|xa tri)/.test(normalized)
    ) {
      return "DIAGNOSIS";
    }
    return "GENERAL";
  }

  private sourceQueries(
    message: string,
    intent: AiAssistantIntent,
  ): readonly string[] {
    switch (intent) {
      case "TREATMENT_PREPARATION":
        return ["hóa trị", "điều trị"];
      case "DIAGNOSIS":
        return ["ung thư", "điều trị"];
      case "NUTRITION":
        return ["dinh dưỡng", "ăn uống"];
      case "MENTAL_HEALTH":
        return ["tâm lý", "tinh thần"];
      case "SUPPORT_PROGRAM":
        return ["chương trình hỗ trợ", "hỗ trợ"];
      default:
        return [message];
    }
  }

  private intentLabel(intent: AiAssistantIntent): string {
    const labels: Record<AiAssistantIntent, string> = {
      TREATMENT_PREPARATION: "chuẩn bị trước điều trị",
      DIAGNOSIS: "chẩn đoán và điều trị",
      NUTRITION: "dinh dưỡng",
      MENTAL_HEALTH: "tâm lý và tinh thần",
      SUPPORT_PROGRAM: "chương trình hỗ trợ",
      GENERAL: "thông tin chung",
    };
    return labels[intent];
  }

  private fallbackSources(intent: AiAssistantIntent): AiAssistantSource[] {
    if (intent === "SUPPORT_PROGRAM") {
      return [
        {
          title: "Các chương trình hỗ trợ",
          link: "/cong-dong/chuong-trinh-ho-tro",
          type: "SUPPORT_PROGRAM",
        },
      ];
    }
    if (intent === "MENTAL_HEALTH") {
      return [
        {
          title: "Góc tâm lý và tinh thần",
          link: "/goc-tam-ly",
          type: "STORY",
        },
      ];
    }
    if (intent === "NUTRITION") {
      return [
        {
          title: "Cẩm nang dinh dưỡng",
          link: "/cam-nang",
          type: "GUIDE",
        },
      ];
    }
    return [
      { title: "Cẩm nang đồng hành", link: "/cam-nang", type: "GUIDE" },
      {
        title: "Thông tin các loại ung thư",
        link: "/loai-ung-thu",
        type: "CANCER_TYPE",
      },
    ];
  }

  private normalize(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase();
  }
}
