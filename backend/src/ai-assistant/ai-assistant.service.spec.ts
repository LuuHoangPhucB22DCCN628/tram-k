import { ConfigService } from "@nestjs/config";

import { SearchService } from "../search/search.service";
import { AiAssistantService } from "./ai-assistant.service";

describe("AiAssistantService", () => {
  const searchService = {
    search: jest.fn(),
    publishedPassages: jest.fn(),
    publishedSupportOptions: jest.fn(),
  } as unknown as SearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    (searchService.search as jest.Mock).mockResolvedValue({ items: [] });
    (searchService.publishedPassages as jest.Mock).mockResolvedValue([]);
    (searchService.publishedSupportOptions as jest.Mock).mockResolvedValue([]);
  });

  it("greets without searching or sending a request to the AI provider", async () => {
    const service = new AiAssistantService(
      new ConfigService({ AI_PROVIDER: "openai", OPENAI_API_KEY: "test-secret" }),
      searchService,
    );
    const response = await service.ask({ message: "Xin chào!", history: [] });

    expect(response.answer).toContain("Chào bạn");
    expect(response.sources).toEqual([]);
    expect(searchService.search).not.toHaveBeenCalled();
  });

  it("answers current date and time from the server clock without asking the model", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-20T10:53:00Z"));
    const request = jest.spyOn(global, "fetch");
    try {
      const service = new AiAssistantService(new ConfigService({ AI_PROVIDER: "ollama" }), searchService);
      const date = await service.ask({ message: "Hôm nay là ngày mấy?", history: [] });
      const time = await service.ask({ message: "Bây giờ là mấy giờ?", history: [] });

      expect(date.answer).toContain("20/10/2026");
      expect(time.answer).toContain("17:53");
      expect(date.mode).toBe("LOCAL");
      expect(searchService.search).not.toHaveBeenCalled();
      expect(request).not.toHaveBeenCalled();
    } finally {
      request.mockRestore();
      jest.useRealTimers();
    }
  });

  it("does not mistake an appointment question for a current-time question", async () => {
    const service = new AiAssistantService(new ConfigService({ AI_PROVIDER: "local" }), searchService);
    const reply = await service.ask({ message: "Hôm nay tôi hóa trị lúc mấy giờ?", history: [] });

    expect(reply.answer).not.toContain("Bây giờ là");
    expect(searchService.search).toHaveBeenCalled();
  });

  it("clarifies an ambiguous abdominal-pain follow-up using the preceding question", async () => {
    const service = new AiAssistantService(new ConfigService({ AI_PROVIDER: "local" }), searchService);

    const response = await service.ask({
      message: "đau bụng có phải không",
      history: [{ role: "user", content: "Đây có phải dấu hiệu ung thư không?" }],
    });

    expect(response.answer).toContain("đau bụng có phải dấu hiệu ung thư không");
    expect(response.answer).toContain("không thể kết luận");
    expect(response.sources).toEqual([expect.objectContaining({ link: "https://www.cancer.gov/about-cancer/diagnosis-staging/symptoms" })]);
    expect(searchService.search).not.toHaveBeenCalled();
  });

  it("asks what an abdominal-pain question refers to when there is no cancer context", async () => {
    const service = new AiAssistantService(new ConfigService({ AI_PROVIDER: "local" }), searchService);

    const response = await service.ask({ message: "đau bụng có phải không", history: [] });

    expect(response.answer).toContain("có phải dấu hiệu của bệnh nào");
    expect(response.sources).not.toContainEqual(expect.objectContaining({ link: "/cam-nang" }));
  });

  it("routes severe abdominal pain to the existing urgent response", async () => {
    const service = new AiAssistantService(new ConfigService({ AI_PROVIDER: "local" }), searchService);

    const response = await service.ask({ message: "Tôi đau bụng dữ dội", history: [] });

    expect(response.mode).toBe("SAFETY");
    expect(searchService.search).not.toHaveBeenCalled();
  });

  it("returns an immediate safety response without calling an AI provider", async () => {
    const config = new ConfigService({
      AI_PROVIDER: "openai",
      OPENAI_API_KEY: "test-secret",
    });
    const service = new AiAssistantService(config, searchService);

    const response = await service.ask({
      message: "Tôi đang khó thở dữ dội và đau ngực dữ dội",
      history: [],
    });

    expect(response.mode).toBe("SAFETY");
    expect(response.answer).toContain("cấp cứu");
    expect(searchService.search).not.toHaveBeenCalled();
  });

  it("answers locally and includes a relevant internal support-program link", async () => {
    const config = new ConfigService({ AI_PROVIDER: "local" });
    const service = new AiAssistantService(config, searchService);

    const response = await service.ask({
      message: "Tôi muốn tìm chương trình hỗ trợ chi phí",
      history: [],
    });

    expect(response.mode).toBe("LOCAL");
    expect(response.disclaimer).toContain("không thay thế");
    expect(response.sources).toContainEqual(
      expect.objectContaining({ link: "/cong-dong/chuong-trinh-ho-tro" }),
    );
  });

  it("uses matching Trạm K search results as sources", async () => {
    (searchService.search as jest.Mock).mockResolvedValue({
      items: [
        {
          id: "guide-1",
          title: "Dinh dưỡng trong hóa trị",
          description: "Các bữa ăn trong thời gian điều trị cần phù hợp với thể trạng.",
          link: "/cam-nang/dinh-duong",
          type: "GUIDE",
        },
      ],
    });
    const service = new AiAssistantService(
      new ConfigService({ AI_PROVIDER: "local" }),
      searchService,
    );

    const response = await service.ask({
      message: "Ăn uống khi hóa trị",
      history: [],
    });

    expect(response.sources).toEqual([
      {
        title: "Dinh dưỡng trong hóa trị",
        link: "/cam-nang/dinh-duong",
        type: "GUIDE",
      },
    ]);
  });

  it("returns clickable published articles when asked for recommendations", async () => {
    (searchService.search as jest.Mock).mockResolvedValue({ items: [
      { id: "guide-1", title: "Dinh dưỡng trong hóa trị", link: "/cam-nang/dinh-duong", type: "GUIDE" },
      { id: "guide-2", title: "Lưu ý ăn uống khi điều trị", link: "/cam-nang/an-uong", type: "GUIDE" },
    ] });
    const service = new AiAssistantService(new ConfigService({ AI_PROVIDER: "ollama" }), searchService);
    const request = jest.spyOn(global, "fetch");
    try {
      const response = await service.ask({ message: "Gợi ý một số bài viết về dinh dưỡng khi hóa trị", history: [] });
      expect(response.answer).toContain("bữa nhỏ");
      expect(response.sources.map((source) => source.link)).toEqual([
        "/cam-nang/dinh-duong", "/cam-nang/an-uong",
      ]);
      expect(request).not.toHaveBeenCalled();
    } finally {
      request.mockRestore();
    }
  });

  it("matches published meal support by the explicitly named region", async () => {
    (searchService.publishedSupportOptions as jest.Mock).mockResolvedValue([
      { id: "meal-hn", type: "SUPPORT_PROGRAM", title: "Bữa cơm Hà Nội", regionId: "ha-noi", city: "Hà Nội", address: "Bệnh viện K", schedule: "Thứ Tư", supportType: "MEAL", description: "", capacityRemaining: 5 },
      { id: "meal-dn", type: "SUPPORT_PROGRAM", title: "Bữa cơm Đà Nẵng", regionId: "da-nang", city: "Đà Nẵng", address: "Bệnh viện Đà Nẵng", schedule: "Thứ Sáu", supportType: "MEAL", description: "", capacityRemaining: 8 },
      { id: "spot-hn", type: "DONATION_LOCATION", title: "Điểm phát cơm Tân Triều", regionId: "ha-noi", city: "", address: "Tân Triều", schedule: "Chủ Nhật", supportType: "MEAL", description: "" },
    ]);
    const service = new AiAssistantService(new ConfigService({ AI_PROVIDER: "ollama" }), searchService);
    const response = await service.ask({ message: "Tìm địa chỉ phát cơm từ thiện ở Hà Nội", history: [] });
    expect(response.answer).toContain("Bữa cơm Hà Nội");
    expect(response.answer).toContain("Tân Triều");
    expect(response.answer).not.toContain("Bữa cơm Đà Nẵng");
    expect(response.sources.map((source) => source.link)).toEqual([
      "/cong-dong/diem-quyen-gop/ha-noi?location=spot-hn",
      "/cong-dong/chuong-trinh-ho-tro?program=meal-hn",
    ]);
    expect(searchService.search).not.toHaveBeenCalled();
  });

  it("keeps a published support link but warns instead of repeating its placeholder address", async () => {
    (searchService.publishedSupportOptions as jest.Mock).mockResolvedValue([{
      id: "cao-bang-meal", type: "SUPPORT_PROGRAM", title: "Bữa cơm yêu thương",
      regionId: "cao-bang", city: "Cao Bằng", address: "dddddddddddddd",
      addressNeedsReview: true, schedule: "Thứ Hai", supportType: "MEAL",
      description: "Suất cơm", capacityRemaining: 10,
    }]);
    const service = new AiAssistantService(new ConfigService({ AI_PROVIDER: "local" }), searchService);

    const response = await service.ask({ message: "Chương trình phát cơm ở Cao Bằng", history: [] });

    expect(response.answer).toContain("địa chỉ công khai chưa đủ rõ");
    expect(response.answer).not.toContain("dddddddddddddd");
    expect(response.sources).toContainEqual(expect.objectContaining({
      link: "/cong-dong/chuong-trinh-ho-tro?program=cao-bang-meal",
    }));
  });

  it("recommends only a program matching the requested date and time", async () => {
    (searchService.publishedSupportOptions as jest.Mock).mockResolvedValue([
      { id: "morning", type: "SUPPORT_PROGRAM", title: "Bữa cơm sáng", regionId: "ha-noi", city: "Hà Nội", address: "Bệnh viện K Tân Triều", schedule: "09:00–11:00, ngày 24/10/2099", supportType: "MEAL", description: "", capacityRemaining: 10,
        structuredSchedule: { scheduleType: "ONE_TIME", startsOn: "2099-10-24", startTime: "09:00", endTime: "11:00" } },
      { id: "evening", type: "SUPPORT_PROGRAM", title: "Bữa cơm tối", regionId: "ha-noi", city: "Hà Nội", address: "Bệnh viện K Tân Triều", schedule: "18:00–20:00, ngày 24/10/2099", supportType: "MEAL", description: "", capacityRemaining: 10,
        structuredSchedule: { scheduleType: "ONE_TIME", startsOn: "2099-10-24", startTime: "18:00", endTime: "20:00" } },
    ]);
    const service = new AiAssistantService(new ConfigService({ AI_PROVIDER: "local" }), searchService);

    const response = await service.ask({ message: "Tìm suất cơm ở Hà Nội ngày 24/10/2099 lúc 10h", history: [] });

    expect(response.answer).toContain("Bữa cơm sáng");
    expect(response.answer).not.toContain("Bữa cơm tối");
    expect(response.sources.map((source) => source.link)).toEqual([
      "/cong-dong/chuong-trinh-ho-tro?program=morning",
    ]);
  });

  it("asks for a region instead of guessing where the patient lives", async () => {
    const service = new AiAssistantService(new ConfigService({ AI_PROVIDER: "local" }), searchService);
    const response = await service.ask({ message: "Tôi cần suất cơm từ thiện", history: [] });
    expect(response.answer).toContain("tỉnh/thành nào");
    expect(response.sources).not.toContainEqual(expect.objectContaining({ link: expect.stringContaining("?program=") }));
  });

  it("shows fixed-schedule map points for a general Hanoi support-point question", async () => {
    (searchService.publishedSupportOptions as jest.Mock).mockResolvedValue([
      { id: "program-hn", type: "SUPPORT_PROGRAM", title: "Chương trình khác", regionId: "ha-noi", city: "Hà Nội", address: "Hà Nội", schedule: "Thứ Hai", supportType: "FINANCIAL", description: "", capacityRemaining: 3 },
      { id: "tan-trieu", type: "DONATION_LOCATION", title: "Viện K Tân Triều", regionId: "ha-noi", city: "Hà Nội", address: "30 Cầu Bươu", schedule: "Thứ Tư", supportType: "MEAL", description: "" },
    ]);
    const service = new AiAssistantService(new ConfigService({ AI_PROVIDER: "local" }), searchService);

    const response = await service.ask({ message: "điểm hỗ trợ hà nội", history: [] });

    expect(response.answer).toContain("Viện K Tân Triều");
    expect(response.sources[0]).toEqual(expect.objectContaining({
      link: "/cong-dong/diem-quyen-gop/ha-noi?location=tan-trieu",
    }));
  });

  it("keeps an explicit registration request scoped to programs", async () => {
    (searchService.publishedSupportOptions as jest.Mock).mockResolvedValue([
      { id: "program-hn", type: "SUPPORT_PROGRAM", title: "Chương trình Hà Nội", regionId: "ha-noi", city: "Hà Nội", address: "Hà Nội", schedule: "Thứ Hai", supportType: "FINANCIAL", description: "", capacityRemaining: 3 },
      { id: "tan-trieu", type: "DONATION_LOCATION", title: "Viện K Tân Triều", regionId: "ha-noi", city: "Hà Nội", address: "30 Cầu Bươu", schedule: "Thứ Tư", supportType: "MEAL", description: "" },
    ]);
    const service = new AiAssistantService(new ConfigService({ AI_PROVIDER: "local" }), searchService);

    const response = await service.ask({ message: "đăng ký chương trình hỗ trợ ở Hà Nội", history: [] });

    expect(response.sources.map((source) => source.type)).toEqual(["SUPPORT_PROGRAM"]);
  });

  it("includes both available programs and map points for a general support request", async () => {
    (searchService.publishedSupportOptions as jest.Mock).mockResolvedValue([
      { id: "program-hn", type: "SUPPORT_PROGRAM", title: "Chương trình Hà Nội", regionId: "ha-noi", city: "Hà Nội", address: "Bệnh viện K", schedule: "Thứ Hai", supportType: "FINANCIAL", description: "", capacityRemaining: 3 },
      { id: "tan-trieu", type: "DONATION_LOCATION", title: "Viện K Tân Triều", regionId: "ha-noi", city: "Hà Nội", address: "30 Cầu Bươu", schedule: "Thứ Tư", supportType: "MEAL", description: "" },
    ]);
    const service = new AiAssistantService(new ConfigService({ AI_PROVIDER: "local" }), searchService);

    const response = await service.ask({ message: "gợi ý chương trình và địa điểm hỗ trợ ở Hà Nội", history: [] });

    expect(response.sources.map((source) => source.type)).toEqual(["DONATION_LOCATION", "SUPPORT_PROGRAM"]);
  });

  it("uses recent support context when the user replies with only Hà Nội", async () => {
    (searchService.publishedSupportOptions as jest.Mock).mockResolvedValue([
      { id: "tan-trieu", type: "DONATION_LOCATION", title: "Viện K Tân Triều", regionId: "ha-noi", city: "Hà Nội", address: "30 Cầu Bươu", schedule: "Thứ Tư", supportType: "MEAL", description: "" },
    ]);
    const service = new AiAssistantService(new ConfigService({ AI_PROVIDER: "ollama" }), searchService);
    const history = [
      { role: "user" as const, content: "Tìm điểm hỗ trợ cho tôi" },
      { role: "assistant" as const, content: "Bạn cần tìm ở tỉnh/thành nào?" },
      { role: "user" as const, content: "Ninh Bình" },
      { role: "assistant" as const, content: "Chưa thấy điểm hỗ trợ tại Ninh Bình." },
    ];
    const request = jest.spyOn(global, "fetch");
    try {
      const response = await service.ask({ message: "Hà Nội", history });
      expect(response.answer).toContain("Viện K Tân Triều");
      expect(response.sources).toEqual([expect.objectContaining({
        link: "/cong-dong/diem-quyen-gop/ha-noi?location=tan-trieu",
      })]);
      expect(request).not.toHaveBeenCalled();
    } finally {
      request.mockRestore();
    }
  });

  it("shows public places when a new conversation starts with only a supported province", async () => {
    (searchService.publishedSupportOptions as jest.Mock).mockResolvedValue([
      { id: "tan-trieu", type: "DONATION_LOCATION", title: "Viện K Tân Triều", regionId: "ha-noi", city: "Hà Nội", address: "30 Cầu Bươu", schedule: "Thứ Tư", supportType: "MEAL", description: "" },
    ]);
    const service = new AiAssistantService(new ConfigService({ AI_PROVIDER: "local" }), searchService);

    const response = await service.ask({ message: "Hà Nội", history: [] });

    expect(response.sources[0].link).toBe("/cong-dong/diem-quyen-gop/ha-noi?location=tan-trieu");
  });

  it("reports that a named region has no published support instead of inventing a location", async () => {
    (searchService.publishedSupportOptions as jest.Mock).mockResolvedValue([
      { id: "tan-trieu", type: "DONATION_LOCATION", title: "Viện K Tân Triều", regionId: "ha-noi", city: "Hà Nội", address: "30 Cầu Bươu", schedule: "Thứ Tư", supportType: "MEAL", description: "" },
    ]);
    const service = new AiAssistantService(new ConfigService({ AI_PROVIDER: "local" }), searchService);
    const response = await service.ask({ message: "Ninh Bình", history: [
      { role: "user", content: "Tìm điểm hỗ trợ cho tôi" },
      { role: "assistant", content: "Bạn cần tìm ở tỉnh/thành nào?" },
    ] });

    expect(response.answer).toContain("chưa thấy");
    expect(response.answer).toContain("Ninh Bình");
    expect(response.sources[0].link).toBe("/cong-dong/diem-quyen-gop/ninh-binh");
    expect(response.sources).not.toContainEqual(expect.objectContaining({ title: "Viện K Tân Triều" }));
  });

  it("does not suggest a patient-only program to a caregiver and explains stated criteria", async () => {
    (searchService.publishedSupportOptions as jest.Mock).mockResolvedValue([
      { id: "patient-only", type: "SUPPORT_PROGRAM", title: "Chỉ bệnh nhân", regionId: "ha-noi", city: "Hà Nội", address: "K", schedule: "Thứ Bảy", supportType: "MEAL", description: "", eligibleAudience: "PATIENT", capacityRemaining: 3 },
      { id: "family", type: "SUPPORT_PROGRAM", title: "Bữa cơm cho người nhà", regionId: "ha-noi", city: "Hà Nội", address: "K", schedule: "Chủ Nhật", supportType: "MEAL", description: "", eligibleAudience: "PATIENT_AND_CAREGIVER", financialNeedRequired: true, eligibilityNote: "Đang chăm sóc người điều trị", capacityRemaining: 4 },
    ]);
    const service = new AiAssistantService(new ConfigService({ AI_PROVIDER: "local" }), searchService);

    const response = await service.ask({ message: "Tôi là người nhà, cần suất cơm ở Hà Nội", history: [] });

    expect(response.answer).toContain("Bữa cơm cho người nhà");
    expect(response.answer).toContain("hoàn cảnh khó khăn");
    expect(response.answer).not.toContain("Chỉ bệnh nhân");
    expect(response.sources).toEqual([expect.objectContaining({ link: "/cong-dong/chuong-trinh-ho-tro?program=family" })]);
  });

  it("answers from a relevant published passage instead of only returning an article link", async () => {
    (searchService.search as jest.Mock).mockResolvedValue({ items: [{
      id: "lung-1", title: "Ung thư phổi", description: "Thông tin chung về ung thư phổi.",
      link: "/loai-ung-thu/ung-thu-phoi", type: "CANCER_TYPE",
    }] });
    (searchService.publishedPassages as jest.Mock).mockResolvedValue([{
      sourceId: "lung-1", type: "CANCER_TYPE",
      passages: ["Dấu hiệu ung thư phổi có thể khác nhau giữa mỗi người; bài viết nêu các dấu hiệu cần trao đổi với bác sĩ."],
    }]);
    const service = new AiAssistantService(new ConfigService({ AI_PROVIDER: "local" }), searchService);

    const response = await service.ask({ message: "Dấu hiệu ung thư phổi là gì?", history: [] });

    expect(response.answer).toContain("Dấu hiệu ung thư phổi có thể khác nhau");
    expect(response.answer).toContain("Theo bài “Ung thư phổi”");
    expect(response.sources).toEqual([{ title: "Ung thư phổi", link: "/loai-ung-thu/ung-thu-phoi", type: "CANCER_TYPE" }]);
  });

  it("does not present an unrelated article summary as an answer", async () => {
    (searchService.search as jest.Mock).mockResolvedValue({ items: [{
      id: "lung-1", title: "Ung thư phổi", link: "/loai-ung-thu/ung-thu-phoi", type: "CANCER_TYPE",
    }] });
    (searchService.publishedPassages as jest.Mock).mockResolvedValue([{
      sourceId: "lung-1", type: "CANCER_TYPE", passages: ["Các hoạt động hỗ trợ cộng đồng trong tháng này."],
    }]);
    const service = new AiAssistantService(new ConfigService({ AI_PROVIDER: "local" }), searchService);

    const response = await service.ask({ message: "Dấu hiệu ung thư phổi là gì?", history: [] });

    expect(response.answer).not.toContain("Các hoạt động hỗ trợ cộng đồng");
  });

  it("does not use a community story as medical evidence", async () => {
    (searchService.search as jest.Mock).mockResolvedValue({ items: [{
      id: "story-1", title: "Câu chuyện về ung thư phổi", link: "/cau-chuyen/story-1", type: "STORY",
    }] });
    const service = new AiAssistantService(new ConfigService({ AI_PROVIDER: "local" }), searchService);

    const response = await service.ask({ message: "Dấu hiệu ung thư phổi là gì?", history: [] });

    expect(response.sources).not.toContainEqual(expect.objectContaining({ type: "STORY" }));
    expect(searchService.publishedPassages).not.toHaveBeenCalled();
  });

  it("distinguishes treatment preparation from nutrition advice", async () => {
    const service = new AiAssistantService(
      new ConfigService({ AI_PROVIDER: "local" }),
      searchService,
    );

    const response = await service.ask({
      message: "Tôi nên chuẩn bị gì trước buổi hóa trị đầu tiên?",
      history: [],
    });

    expect(response.answer).toContain("Trước buổi hóa trị đầu tiên");
    expect(response.answer).toContain("xác nhận giờ đến");
    expect(response.answer).not.toContain("ưu tiên bữa nhỏ");
    expect(searchService.search).toHaveBeenCalledWith(expect.objectContaining({ q: "hóa trị", page: 1 }));
  });

  it("keeps food questions during chemotherapy in the nutrition flow", async () => {
    const service = new AiAssistantService(
      new ConfigService({ AI_PROVIDER: "local" }),
      searchService,
    );

    const response = await service.ask({
      message: "Tôi nên ăn uống thế nào trong thời gian hóa trị?",
      history: [],
    });

    expect(response.answer).toContain("ưu tiên bữa nhỏ");
    expect(response.answer).not.toContain("xác nhận giờ đến");
    expect(searchService.search).toHaveBeenCalledWith(expect.objectContaining({ q: "dinh dưỡng", page: 1 }));
  });

  it("answers a general question through the local Ollama model without a paid API", async () => {
    const request = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: "Sao Hỏa là hành tinh thứ tư tính từ Mặt Trời." } }),
    } as Response);
    try {
      const service = new AiAssistantService(
        new ConfigService({ AI_PROVIDER: "ollama", OLLAMA_MODEL: "qwen3:4b-instruct" }),
        searchService,
      );
      const response = await service.ask({
        message: "Sao Hỏa là hành tinh thứ mấy?",
        history: [{ role: "user", content: "Cho tôi hỏi về các hành tinh" }],
      });

      expect(response.mode).toBe("OLLAMA");
      expect(response.answer).toContain("thứ tư");
      expect(request).toHaveBeenCalledWith("http://127.0.0.1:11434/api/chat", expect.objectContaining({ method: "POST" }));
      const body = JSON.parse(request.mock.calls[0][1]?.body as string) as {
        model: string;
        stream: boolean;
        keep_alive: string;
        options: { num_ctx: number; num_predict: number };
        messages: { role: string; content: string }[];
      };
      expect(body.model).toBe("qwen3:4b-instruct");
      expect(body.stream).toBe(false);
      expect(body.keep_alive).toBe("20m");
      expect(body.options).toMatchObject({ num_ctx: 3072, num_predict: 320 });
      expect(body.messages.map(({ role }) => role)).toEqual(["system", "user", "user"]);
      expect(body.messages[0].content).toContain("không được chẩn đoán");
      expect(body.messages[0].content).toContain("không quá 120 từ");
    } finally {
      request.mockRestore();
    }
  });

  it("does not invent a Trạm K answer from an article with only a generic description", async () => {
    (searchService.search as jest.Mock).mockResolvedValue({ items: [
      { id: "breast", title: "Ung thư vú", link: "/loai-ung-thu/ung-thu-vu", type: "CANCER_TYPE" },
      { id: "lung", title: "Ung thư phổi", link: "/loai-ung-thu/ung-thu-phoi", type: "CANCER_TYPE" },
    ] });
    (searchService.publishedPassages as jest.Mock).mockResolvedValue([{
      sourceId: "lung", type: "CANCER_TYPE",
      passages: ["Trang tra cứu tổng quan, dấu hiệu cần lưu ý và các câu hỏi nên trao đổi với nhân viên y tế."],
    }]);
    const request = jest.spyOn(global, "fetch");
    try {
      const service = new AiAssistantService(new ConfigService({ AI_PROVIDER: "ollama" }), searchService);
      const response = await service.ask({ message: "Theo Trạm K, ung thư phổi có dấu hiệu gì?", history: [] });

      expect(searchService.publishedPassages).toHaveBeenCalledWith([{ id: "lung", type: "CANCER_TYPE" }]);
      expect(response.answer).toContain("chưa có đủ chi tiết");
      expect(response.sources).toEqual([{ title: "Ung thư phổi", link: "/loai-ung-thu/ung-thu-phoi", type: "CANCER_TYPE" }]);
      expect(request).not.toHaveBeenCalled();
    } finally {
      request.mockRestore();
    }
  });

  it("answers support questions locally without waiting for Ollama", async () => {
    const request = jest.spyOn(global, "fetch").mockRejectedValue(new Error("offline"));
    try {
      const service = new AiAssistantService(new ConfigService({ AI_PROVIDER: "ollama" }), searchService);
      const response = await service.ask({ message: "Tôi muốn tìm chương trình hỗ trợ chi phí", history: [] });

      expect(response.mode).toBe("LOCAL");
      expect(response.sources).toContainEqual(expect.objectContaining({ link: "/cong-dong/chuong-trinh-ho-tro" }));
      expect(request).not.toHaveBeenCalled();
    } finally {
      request.mockRestore();
    }
  });

  it("explains that broad answers are unavailable while the local model is offline", async () => {
    const request = jest.spyOn(global, "fetch").mockRejectedValue(new Error("offline"));
    try {
      const service = new AiAssistantService(new ConfigService({ AI_PROVIDER: "ollama" }), searchService);
      const response = await service.ask({ message: "Sao Hỏa là hành tinh thứ mấy?", history: [] });

      expect(response.mode).toBe("LOCAL");
      expect(response.answer).toContain("Mô hình AI cục bộ hiện chưa sẵn sàng");
    } finally {
      request.mockRestore();
    }
  });
});
