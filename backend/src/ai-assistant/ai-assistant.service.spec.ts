import { ConfigService } from "@nestjs/config";

import { SearchService } from "../search/search.service";
import { AiAssistantService } from "./ai-assistant.service";

describe("AiAssistantService", () => {
  const searchService = {
    search: jest.fn(),
  } as unknown as SearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    (searchService.search as jest.Mock).mockResolvedValue({ items: [] });
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
          title: "Dinh dưỡng trong hóa trị",
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
    expect(searchService.search).toHaveBeenCalledWith({
      q: "hóa trị",
      page: 1,
      pageSize: 4,
    });
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
    expect(searchService.search).toHaveBeenCalledWith({
      q: "dinh dưỡng",
      page: 1,
      pageSize: 4,
    });
  });
});
