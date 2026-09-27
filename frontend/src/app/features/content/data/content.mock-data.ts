import type {
  ContentCategory,
  ContentDetail,
  ContentImage,
  ContentKind,
  ContentPublicationStatus,
  ContentSection,
  ContentTag,
} from '../models/content.models';

const CATEGORIES = {
  treatment: { id: 'CAT-TREATMENT', name: 'Điều trị', slug: 'dieu-tri' },
  nutrition: {
    id: 'CAT-NUTRITION',
    name: 'Chế độ dinh dưỡng',
    slug: 'dinh-duong',
  },
  signs: { id: 'CAT-SIGNS', name: 'Dấu hiệu', slug: 'dau-hieu' },
  care: { id: 'CAT-CARE', name: 'Chăm sóc', slug: 'cham-soc' },
  patientStory: {
    id: 'CAT-PATIENT-STORY',
    name: 'Hành trình người bệnh',
    slug: 'nguoi-benh',
  },
  companionStory: {
    id: 'CAT-COMPANION',
    name: 'Người đồng hành',
    slug: 'nguoi-dong-hanh',
  },
  cancerInfo: {
    id: 'CAT-CANCER-INFO',
    name: 'Thông tin bệnh',
    slug: 'thong-tin-benh',
  },
} as const satisfies Record<string, ContentCategory>;

const TAGS = {
  beginner: { name: 'Dành cho người mới', slug: 'nguoi-moi' },
  family: { name: 'Gia đình', slug: 'gia-dinh' },
  selfCare: { name: 'Tự chăm sóc', slug: 'tu-cham-soc' },
  hope: { name: 'Hy vọng', slug: 'hy-vong' },
  reference: { name: 'Tra cứu', slug: 'tra-cuu' },
} as const satisfies Record<string, ContentTag>;

const IMAGES = {
  family: image('guide-family.png', 'Gia đình đồng hành cùng người bệnh', 1000, 665),
  story: image('explore-story.svg', 'Minh họa những bàn tay nâng đỡ hành trình', 848, 302),
  cancer: image('explore-cancer-types.svg', 'Minh họa tra cứu các loại ung thư', 580, 239),
} as const satisfies Record<string, ContentImage>;

const GUIDE_IMAGES = {
  nutrition1: guideImage('nutrition-01.png', 'Mâm thức ăn cân bằng nhiều nhóm chất'),
  nutrition2: guideImage('nutrition-02.png', 'Người phụ nữ đang uống nước'),
  nutrition3: guideImage('nutrition-03.png', 'Bữa ăn giàu dinh dưỡng'),
  nutrition4: guideImage('nutrition-04.png', 'Đĩa thức ăn lành mạnh'),
  signs1: guideImage('signs-01.png', 'Người bệnh nghỉ ngơi bên cửa sổ'),
  signs2: guideImage('signs-02.png', 'Bàn chân trên cân sức khỏe'),
  signs3: guideImage('signs-03.png', 'Minh họa hệ tiết niệu'),
  signs4: guideImage('signs-04.png', 'Người bệnh có biểu hiện ho kéo dài'),
  treatment1: guideImage('treatment-01.png', 'Người bệnh được điều trị bằng máy xạ trị'),
  treatment2: guideImage('treatment-02.png', 'Người bệnh đang truyền thuốc hóa trị'),
  treatment3: guideImage('treatment-03.png', 'Bác sĩ định vị vùng điều trị bằng tia'),
  treatment4: guideImage('treatment-04.png', 'Nhân viên y tế chăm sóc đường truyền'),
  care1: {
    ...guideImage('care-01.png', 'Bác sĩ hướng dẫn người bệnh trong quá trình chăm sóc'),
    crop: {
      widthPercent: 238.67,
      heightPercent: 142.06,
      leftPercent: -81.37,
      topPercent: 0,
    },
  },
  care2: guideImage('care-02.png', 'Người bệnh tập vận động nhẹ cùng người hướng dẫn'),
  care3: guideImage('care-03.png', 'Nhân viên y tế theo dõi sức khỏe người bệnh'),
  care4: guideImage('care-04.png', 'Người bệnh được tư vấn về chế độ dinh dưỡng'),
} as const satisfies Record<string, ContentImage>;

const GUIDE_DETAIL_IMAGES = {
  sleepOverview: guideDetailImage(
    'signs-sleep-overview.jpg',
    'Các dấu hiệu âm thầm khi ngủ cần được theo dõi',
    2048,
    1152,
  ),
  persistentCough: guideDetailImage(
    'signs-persistent-cough.png',
    'Người bệnh có biểu hiện ho kéo dài',
    800,
    450,
  ),
  nightSweats: guideDetailImage(
    'signs-night-sweats.jpg',
    'Người bệnh thức giấc với tình trạng đổ mồ hôi đêm',
    800,
    550,
  ),
  legCramps: guideDetailImage(
    'signs-leg-cramps.jpg',
    'Người bệnh bị đau và chuột rút ở chân',
    620,
    349,
  ),
  nocturia: guideDetailImage(
    'signs-nocturia.jpg',
    'Người bệnh gặp tình trạng đi tiểu đêm nhiều lần',
    800,
    450,
  ),
} as const satisfies Record<string, ContentImage>;

type ContentSeed = Omit<
  ContentDetail,
  'status' | 'authorName' | 'sections' | 'sources' | 'medicalDisclaimer'
> & {
  readonly status?: ContentPublicationStatus;
  readonly authorName?: string;
  readonly sections?: readonly ContentDetail['sections'][number][];
};

interface PracticalGuideSeed {
  readonly overview: string;
  readonly keyPoints: readonly string[];
  readonly actions: readonly string[];
  readonly contactWhen: string;
}

function image(fileName: string, alt: string, width: number, height: number): ContentImage {
  return { url: `/assets/images/home/${fileName}`, alt, width, height };
}

function guideImage(fileName: string, alt: string): ContentImage {
  return {
    url: `/assets/images/guides/${fileName}`,
    alt,
    width: 640,
    height: 480,
  };
}

function guideDetailImage(
  fileName: string,
  alt: string,
  width: number,
  height: number,
): ContentImage {
  return {
    url: `/assets/images/guides/${fileName}`,
    alt,
    width,
    height,
  };
}

function practicalGuide(seed: PracticalGuideSeed): readonly ContentSection[] {
  return [
    {
      heading: '1. Tổng quan',
      paragraphs: [seed.overview],
    },
    {
      heading: '2. Những điều cần lưu ý',
      paragraphs: [
        'Mỗi người có thể trạng và phác đồ khác nhau. Hãy theo dõi thay đổi của cơ thể thay vì tự so sánh với người khác.',
      ],
      bullets: seed.keyPoints,
    },
    {
      heading: '3. Gợi ý thực hiện',
      paragraphs: [
        'Có thể bắt đầu từ những việc nhỏ, ghi lại kết quả và điều chỉnh theo hướng dẫn của đội ngũ điều trị.',
      ],
      bullets: seed.actions,
    },
    {
      heading: '4. Khi nào cần liên hệ nhân viên y tế?',
      paragraphs: [seed.contactWhen],
    },
  ];
}

function content(seed: ContentSeed): ContentDetail {
  const isMedicalContent = seed.kind === 'GUIDE' || seed.kind === 'CANCER_TYPE';
  const { status = 'PUBLISHED', authorName = 'Ban biên tập Trạm K', sections, ...summary } = seed;

  return {
    ...summary,
    status,
    authorName,
    sections: sections ?? [{ paragraphs: [seed.excerpt] }],
    sources: isMedicalContent
      ? [
          {
            label: 'Nguồn tham khảo sẽ được Admin kiểm tra trước khi xuất bản',
            publisher: 'Ban biên tập Trạm K',
            reviewedAt: '2026-09-01',
          },
        ]
      : [],
    medicalDisclaimer: isMedicalContent
      ? 'Thông tin chỉ mang tính tham khảo, không thay thế chẩn đoán hoặc hướng dẫn điều trị của nhân viên y tế.'
      : undefined,
  };
}

export const MOCK_CONTENT_ITEMS: readonly ContentDetail[] = [
  content({
    id: 'GUIDE-001',
    kind: 'GUIDE',
    slug: 'cac-phuong-phap-dieu-tri-ung-thu-tot-nhat-hien-nay',
    title: 'Các phương pháp điều trị ung thư tốt nhất hiện nay',
    excerpt:
      'Tùy thuộc vào từng loại ung thư máu mà bệnh nhân mắc phải, bác sĩ sẽ xây dựng phác đồ điều trị sao cho phù hợp nhất.',
    category: CATEGORIES.treatment,
    tags: [TAGS.beginner, TAGS.family],
    coverImage: GUIDE_IMAGES.treatment1,
    publishedAt: '2026-09-01T08:00:00+07:00',
    readingMinutes: 6,
    featured: true,
    sections: practicalGuide({
      overview:
        'Điều trị ung thư có thể kết hợp phẫu thuật, xạ trị, hóa trị, điều trị đích, miễn dịch hoặc nội tiết. Không có một phương pháp tốt nhất cho tất cả người bệnh; lựa chọn phù hợp phụ thuộc loại ung thư, giai đoạn, dấu ấn sinh học và thể trạng.',
      keyPoints: [
        'Phẫu thuật thường nhằm loại bỏ khối u khi vị trí và giai đoạn cho phép.',
        'Xạ trị sử dụng bức xạ, còn hóa trị dùng thuốc tác động lên tế bào ung thư.',
        'Điều trị đích và miễn dịch cần những tiêu chí phù hợp và vẫn phải theo dõi tác dụng phụ.',
      ],
      actions: [
        'Hỏi rõ mục tiêu điều trị, lợi ích dự kiến, rủi ro và các lựa chọn thay thế.',
        'Mang theo kết quả xét nghiệm, danh sách thuốc và thông tin bệnh nền khi tái khám.',
        'Ghi lại kế hoạch, lịch điều trị và các dấu hiệu cần liên hệ khẩn cấp.',
      ],
      contactWhen:
        'Liên hệ đội ngũ điều trị khi xuất hiện triệu chứng mới hoặc tác dụng phụ tăng nhanh; không tự đổi phác đồ, liều thuốc hay ngừng điều trị.',
    }),
  }),
  content({
    id: 'GUIDE-002',
    kind: 'GUIDE',
    slug: 'nen-an-gi-khi-co-the-thuong-xuyen-met-moi',
    title: 'Nên ăn gì khi cơ thể thường xuyên mệt mỏi?',
    excerpt: 'Gợi ý thực phẩm và món ăn phù hợp cho những ngày thiếu năng lượng.',
    category: CATEGORIES.nutrition,
    tags: [TAGS.selfCare],
    coverImage: GUIDE_IMAGES.nutrition3,
    publishedAt: '2026-08-27T08:00:00+07:00',
    readingMinutes: 5,
    featured: false,
    sections: practicalGuide({
      overview:
        'Mệt mỏi có thể khiến người bệnh khó chuẩn bị và hoàn thành một bữa ăn. Những món nhỏ, mềm, giàu năng lượng và dễ ăn thường thực tế hơn một khẩu phần lớn.',
      keyPoints: [
        'Ưu tiên nguồn đạm như trứng, cá, thịt mềm, sữa, đậu hũ hoặc các loại đậu nếu phù hợp.',
        'Kết hợp tinh bột, rau quả và chất béo lành mạnh để bữa ăn có đủ năng lượng.',
        'Không tự dùng thực phẩm bổ sung liều cao khi chưa trao đổi với bác sĩ.',
      ],
      actions: [
        'Chia ba bữa lớn thành năm hoặc sáu bữa nhỏ trong ngày.',
        'Chuẩn bị sẵn món đơn giản như cháo, súp, sữa chua, sinh tố hoặc bánh mì kẹp trứng.',
        'Ăn vào thời điểm cảm thấy khỏe nhất và nhờ người thân hỗ trợ chuẩn bị món ăn.',
      ],
      contactWhen:
        'Hãy báo nhân viên y tế khi mệt tăng nhanh, không thể ăn uống, nôn kéo dài, chóng mặt nhiều hoặc sụt cân rõ rệt.',
    }),
  }),
  content({
    id: 'GUIDE-003',
    kind: 'GUIDE',
    slug: 'van-dong-nhe-nhang-va-nang-cao-chat-luong-song',
    title: 'Vận động nhẹ nhàng và nâng cao chất lượng sống',
    excerpt:
      'Các hoạt động phù hợp giúp duy trì thể lực, cải thiện tâm trạng, hỗ trợ quá trình phục hồi.',
    category: CATEGORIES.care,
    tags: [TAGS.selfCare, TAGS.family],
    coverImage: GUIDE_IMAGES.care2,
    publishedAt: '2026-08-27T08:00:00+07:00',
    readingMinutes: 6,
    featured: false,
    sections: practicalGuide({
      overview:
        'Vận động phù hợp có thể hỗ trợ duy trì sức mạnh, giấc ngủ và tinh thần trong quá trình điều trị. Mức vận động cần được điều chỉnh theo thể trạng, giai đoạn điều trị và hướng dẫn của bác sĩ.',
      keyPoints: [
        'Bắt đầu chậm với quãng thời gian ngắn và tăng dần khi cơ thể dung nạp tốt.',
        'Ưu tiên đi bộ, kéo giãn hoặc bài tập nhẹ đã được nhân viên y tế đồng ý.',
        'Không tập khi sốt, chóng mặt, đau tăng, khó thở hoặc có nguy cơ té ngã.',
      ],
      actions: [
        'Chia vận động thành nhiều lần, mỗi lần vài phút nếu dễ mệt.',
        'Mang giày phù hợp, uống nước theo hướng dẫn và tập ở nơi an toàn.',
        'Ghi lại mức mệt và khả năng hồi phục để điều chỉnh ở lần tiếp theo.',
      ],
      contactWhen:
        'Dừng tập và liên hệ nhân viên y tế khi đau ngực, khó thở, choáng, tim đập bất thường, chảy máu hoặc mệt không hồi phục.',
    }),
  }),
  content({
    id: 'GUIDE-004',
    kind: 'GUIDE',
    slug: 'cach-cham-soc-benh-nhan-ung-thu-tai-nha',
    title: 'Cách chăm sóc bệnh nhân ung thư tại nhà',
    excerpt:
      'Những lưu ý cần thiết để tạo môi trường sinh hoạt an toàn và thoải mái cho người bệnh.',
    category: CATEGORIES.care,
    tags: [TAGS.family],
    coverImage: GUIDE_IMAGES.care1,
    publishedAt: '2026-08-28T08:00:00+07:00',
    readingMinutes: 7,
    featured: false,
    sections: practicalGuide({
      overview:
        'Chăm sóc tại nhà cần bám sát kế hoạch của cơ sở điều trị, đồng thời bảo đảm môi trường nghỉ ngơi sạch sẽ, dễ di chuyển và phù hợp với khả năng của người bệnh.',
      keyPoints: [
        'Lưu rõ lịch thuốc, tái khám, chế độ ăn và những dấu hiệu cần gọi bác sĩ.',
        'Giảm nguy cơ té ngã, giữ vệ sinh tay và hạn chế tiếp xúc với người đang mắc bệnh truyền nhiễm.',
        'Tôn trọng quyền riêng tư và khuyến khích người bệnh tự làm việc trong khả năng.',
      ],
      actions: [
        'Dùng bảng theo dõi thuốc, nhiệt độ, ăn uống, bài tiết và triệu chứng mỗi ngày.',
        'Sắp xếp lối đi thông thoáng, ánh sáng đầy đủ và vật dụng thường dùng trong tầm với.',
        'Chia lịch chăm sóc giữa các thành viên để người chăm sóc có thời gian nghỉ.',
      ],
      contactWhen:
        'Liên hệ cơ sở điều trị khi người bệnh sốt theo ngưỡng được dặn, khó thở, đau tăng, nôn nhiều, chảy máu, lơ mơ hoặc không thể ăn uống.',
    }),
  }),
  content({
    id: 'GUIDE-005',
    kind: 'GUIDE',
    slug: 'tac-dung-phu-thuong-gap-va-cach-ung-pho',
    title: 'Những tác dụng phụ thường gặp và cách ứng phó',
    excerpt:
      'Nhận biết các tác dụng phụ phổ biến và những biện pháp giúp giảm bớt cảm giác khó chịu trong quá trình điều trị.',
    category: CATEGORIES.treatment,
    tags: [TAGS.beginner],
    coverImage: GUIDE_IMAGES.treatment4,
    publishedAt: '2026-08-24T08:00:00+07:00',
    readingMinutes: 6,
    featured: false,
    sections: practicalGuide({
      overview:
        'Tác dụng phụ phụ thuộc phương pháp điều trị, liều dùng và thể trạng. Theo dõi sớm giúp đội ngũ y tế hướng dẫn chăm sóc hoặc điều chỉnh thuốc hỗ trợ phù hợp.',
      keyPoints: [
        'Mệt mỏi, buồn nôn, thay đổi vị giác, rối loạn tiêu hóa và vấn đề da là những biểu hiện có thể gặp.',
        'Một số dấu hiệu như sốt, khó thở, chảy máu hoặc lơ mơ cần được xử lý khẩn cấp.',
        'Không tự dùng thuốc hay thực phẩm bổ sung để xử lý tác dụng phụ.',
      ],
      actions: [
        'Ghi thời điểm, mức độ và thời gian kéo dài của từng triệu chứng.',
        'Ăn thành bữa nhỏ, nghỉ xen kẽ và chăm sóc da miệng theo hướng dẫn chuyên môn.',
        'Lưu số điện thoại của đơn vị điều trị và chia sẻ dấu hiệu cảnh báo với người chăm sóc.',
      ],
      contactWhen:
        'Gọi ngay cơ sở điều trị khi sốt theo ngưỡng được dặn, nôn không kiểm soát, tiêu chảy nhiều, khó thở, đau ngực, chảy máu hoặc lơ mơ.',
    }),
  }),
  content({
    id: 'GUIDE-006',
    kind: 'GUIDE',
    slug: 'luu-y-dinh-duong-trong-thoi-gian-hoa-tri',
    title: 'Những lưu ý về dinh dưỡng trong thời gian hóa trị',
    excerpt:
      'Những lưu ý giúp cơ thể duy trì năng lượng và thích nghi tốt hơn với quá trình điều trị.',
    category: CATEGORIES.care,
    tags: [TAGS.selfCare],
    coverImage: GUIDE_IMAGES.care4,
    publishedAt: '2026-08-25T08:00:00+07:00',
    readingMinutes: 6,
    featured: false,
    sections: practicalGuide({
      overview:
        'Trong thời gian hóa trị, buồn nôn, thay đổi vị giác, đau miệng hoặc mệt mỏi có thể làm việc ăn uống khó khăn hơn. Mục tiêu là duy trì năng lượng và nước theo khả năng dung nạp.',
      keyPoints: [
        'Chia nhỏ bữa ăn và ưu tiên món mềm, dễ ăn, giàu năng lượng và đạm.',
        'Bảo đảm an toàn thực phẩm vì sức đề kháng có thể suy giảm trong một số thời điểm.',
        'Không tự dùng vitamin liều cao, thảo dược hoặc thực phẩm bổ sung.',
      ],
      actions: [
        'Ăn vào thời điểm ít buồn nôn nhất và chuẩn bị sẵn các phần ăn nhỏ.',
        'Súc miệng, chăm sóc răng miệng và chọn nhiệt độ món ăn dễ chịu.',
        'Theo dõi cân nặng, lượng ăn uống và báo bác sĩ khi giảm rõ rệt.',
      ],
      contactWhen:
        'Hãy liên hệ nhân viên y tế khi không thể ăn hoặc uống, nôn kéo dài, tiêu chảy nhiều, đau miệng nặng, chóng mặt hoặc sụt cân nhanh.',
    }),
  }),
  content({
    id: 'GUIDE-007',
    kind: 'GUIDE',
    slug: 'thap-che-do-dinh-duong-cho-benh-nhan-ung-thu',
    title: 'Tháp chế độ dinh dưỡng cho bệnh nhân ung thư',
    excerpt:
      'Những lưu ý giúp cơ thể duy trì năng lượng và thích nghi tốt hơn với quá trình điều trị.',
    category: CATEGORIES.nutrition,
    tags: [TAGS.selfCare, TAGS.family],
    coverImage: GUIDE_IMAGES.nutrition1,
    publishedAt: '2026-08-29T07:00:00+07:00',
    readingMinutes: 12,
    featured: true,
    sections: [
      {
        heading: '1. Tầm quan trọng của dinh dưỡng trong việc điều trị ung thư',
        paragraphs: [
          'Tại Việt Nam hiện nay, số bệnh nhân mắc bệnh ung thư không được chăm sóc dinh dưỡng đúng cách trong quá trình điều trị bệnh đang ngày một gia tăng. Điều này khiến cho bệnh nhân nhanh chóng bị giảm cân và suy dinh dưỡng rất đáng lo ngại.',
          'Một trong những tình trạng phổ biến nhất mà hầu hết các bệnh nhân ung thư dễ mắc phải là sự suy kiệt của cơ thể. Vấn đề này có thể xuất phát từ những tác dụng phụ không mong muốn của các liệu pháp điều trị ung thư, tâm lý lo lắng, thấp thỏm và chán nản, hoặc do khối u làm quá trình chuyển hoá thông thường của cơ thể bị biến đổi.',
          'Tình trạng suy giảm về cân nặng và thể chất nghiêm trọng khiến nhiều bệnh nhân không thể tiếp tục theo hết liệu trình, làm ảnh hưởng đến hiệu quả điều trị và tiên lượng sống. Khi không được chăm sóc dinh dưỡng đầy đủ, người bệnh còn có nguy cơ cao gặp biến chứng và nhiễm trùng.',
          'Chế độ dinh dưỡng dành cho bệnh nhân ung thư cần bảo đảm đầy đủ chất béo, chất đạm, tinh bột, vitamin, nước và các khoáng chất thiết yếu. Người nhà nên tạo tâm lý thoải mái, chia nhỏ bữa ăn và khuyến khích người bệnh vận động phù hợp với thể trạng.',
        ],
        image: {
          url: '/assets/images/guides/article-nutrition-01.png',
          alt: 'Nhân viên y tế hỗ trợ bữa ăn cho người bệnh',
          width: 630,
          height: 416,
        },
        imageCaption: 'Người bệnh ung thư cần được cung cấp chế độ ăn khoa học',
      },
      {
        heading: '2. Các chất dinh dưỡng cần thiết trong bữa ăn của bệnh nhân ung thư',
        paragraphs: [
          'Một chế độ dinh dưỡng với đầy đủ các nhóm chất quan trọng sẽ giúp bệnh nhân ung thư cải thiện sức đề kháng để chống chọi lại với bệnh tật và nâng cao hiệu quả điều trị. Sự chán ăn có thể đến từ tâm lý sợ hãi, thay đổi khẩu vị hoặc tác dụng phụ của phương pháp chữa trị.',
          'Bệnh nhân nên tăng cường thực phẩm cung cấp nhiều năng lượng, chất đạm và chất lỏng như đồ uống giàu dinh dưỡng, nước ép, sữa hoặc thức ăn nghiền. Người nhà cũng nên tạo không khí thoải mái và vui vẻ trong suốt bữa ăn.',
        ],
      },
      {
        heading: '2.1 Chế độ ăn tinh bột cho người bệnh ung thư',
        paragraphs: [
          'Tinh bột có nhiều trong ngũ cốc nguyên hạt như lúa mạch, lúa mì, ngô, gạo và các loại củ như khoai sọ, khoai lang, khoai tây hoặc sắn. Người bệnh nên hạn chế thực phẩm chế biến sẵn chứa nhiều đường đơn và phụ gia.',
        ],
      },
      {
        heading: '2.2 Chế độ ăn giàu chất đạm',
        paragraphs: [
          'Đạm có nhiều trong các loại thịt, giúp cơ thể hấp thụ đầy đủ các acid amin quan trọng. Bệnh nhân cần ăn đa dạng và cân bằng giữa hai nhóm protein thực vật và động vật.',
        ],
      },
      {
        heading: '2.3 Chế độ ăn có chất béo',
        paragraphs: [
          'Chất béo trong khẩu phần ăn hằng ngày cần cung cấp đủ một hàm lượng nhất định, trong đó hàm lượng acid béo không no không nên vượt quá 50% tổng năng lượng.',
        ],
      },
      {
        heading: '2.4 Chế độ ăn rau quả',
        paragraphs: [
          'Rau củ quả cung cấp một lượng vitamin đáng kể. Trong thời gian điều trị, thay đổi khẩu vị là điều khó tránh khỏi; thịt có thể mang lại cảm giác tanh hoặc đắng. Một số cách giúp giảm khó chịu khi ăn uống gồm:',
        ],
        bullets: [
          'Súc miệng trước khi ăn.',
          'Ăn trái cây có vị chua như chanh, cam, quýt, bưởi nếu không bị đau miệng hoặc họng.',
          'Chia bữa ăn chính thành nhiều bữa nhỏ và ưu tiên món người bệnh yêu thích.',
          'Hạn chế ăn các loại thịt đỏ.',
        ],
        image: {
          url: '/assets/images/guides/article-nutrition-02.png',
          alt: 'Các loại rau củ quả nhiều màu sắc',
          width: 630,
          height: 416,
        },
        imageCaption: 'Người bệnh ung thư nên ăn nhiều loại rau quả có lợi',
      },
      {
        paragraphs: [
          'Người đang xạ trị hoặc hóa trị vùng đầu và cổ có thể bị khô miệng do giảm tiết nước bọt. Nên chọn thức ăn mềm, chứa nhiều nước; uống nước thường xuyên; giữ vệ sinh răng miệng và hạn chế thực phẩm chứa nhiều đường.',
          'Người có tổn thương vùng răng miệng nên tránh thức ăn rắn, khó nhai nuốt hoặc cay nóng. Nếu buồn nôn, nên ăn trước khi quá đói, uống từng ngụm nhỏ và dùng thực phẩm khô như bánh mì nướng hoặc bánh quy giòn.',
          'Bệnh nhân đang điều trị ung thư cần lưu ý uống đủ từ 8–12 cốc nước mỗi ngày và tránh dùng quá nhiều đồ uống chứa cafein.',
        ],
      },
      {
        heading: '3. Tháp chế độ dinh dưỡng cho bệnh nhân ung thư',
        paragraphs: [
          'Hiệp hội Dinh dưỡng Hoa Kỳ (ADA) đưa ra khuyến nghị dưới dạng kim tự tháp nhằm hướng dẫn loại và khẩu phần thực phẩm nên ăn hằng ngày. Không có thực phẩm tốt hay xấu tuyệt đối; thói quen ăn uống lâu dài quan trọng hơn những gì có trong một bữa ăn riêng lẻ.',
        ],
      },
      {
        heading: '3.1 Tham khảo chế độ ăn theo tháp dinh dưỡng',
        paragraphs: [
          'Thực phẩm ở đáy tháp nên được dùng nhiều hơn, trong khi nhóm thịt, bơ sữa và chất béo ở phía trên cần được sử dụng điều độ. Các nhóm thực vật nên được chú trọng hơn sản phẩm nguồn gốc động vật và chất béo bổ sung.',
          'Nhóm bánh mì, ngũ cốc, gạo và mì ống nên dùng khoảng 6–11 phần mỗi ngày. Một khẩu phần có thể là:',
        ],
        bullets: [
          '1 lát bánh mì.',
          '1/2 chén mì ống hoặc ngũ cốc đã nấu chín.',
          '1 oz ngũ cốc ăn liền.',
          '1/3 chén cơm hoặc 4–6 bánh quy giòn.',
        ],
        image: {
          url: '/assets/images/guides/article-nutrition-03.png',
          alt: 'Tháp thực phẩm cân bằng nhiều nhóm dinh dưỡng',
          width: 630,
          height: 416,
        },
        imageCaption:
          'Người bệnh ung thư cần được tư vấn về tháp dinh dưỡng cho khẩu phần ăn từng ngày',
      },
      {
        paragraphs: [
          'Nhóm trái cây nên dùng khoảng 2–4 phần mỗi ngày. Một khẩu phần có thể là một trái cây cỡ vừa, 1/2 chén trái cây tươi hoặc đóng hộp, 1/4 cốc trái cây khô hoặc 3/4 cốc nước ép trái cây 100%.',
          'Nhóm rau nên dùng khoảng 3–5 phần mỗi ngày. Một phần có thể là một chén rau sống, 1/2 chén rau nấu chín hoặc 3/4 cốc nước ép rau củ.',
          'Nhóm sữa, sữa chua và phô mai nên dùng khoảng 2–3 phần mỗi ngày; ưu tiên sữa tách béo hoặc 1% và các loại phô mai mềm.',
          'Nhóm thịt, gia cầm, cá, đậu khô, trứng và hạt nên dùng khoảng 2–3 phần mỗi ngày. Nên lựa chọn thịt nạc và cân bằng với đậu, trứng, hạt hoặc bơ đậu phộng.',
          'Nhóm chất béo, dầu và đồ ngọt chứa nhiều calo nên được hạn chế và sử dụng với khẩu phần nhỏ.',
        ],
        image: {
          url: '/assets/images/guides/article-nutrition-04.png',
          alt: 'Các khay thức ăn được chia thành khẩu phần nhỏ',
          width: 630,
          height: 416,
        },
        imageCaption: 'Khẩu phần ăn khoa học sẽ giúp ích trong hỗ trợ điều trị ung thư',
      },
      {
        paragraphs: [
          'Việc áp dụng chế độ ăn theo tháp dinh dưỡng có vai trò giúp người bệnh giảm thiểu những tác dụng phụ của các đợt điều trị và cải thiện sức khỏe theo chiều hướng tốt nhất.',
          'Nếu cần tư vấn về thực đơn phù hợp với từng tình trạng bệnh, người bệnh nên trao đổi trực tiếp với bác sĩ hoặc chuyên gia dinh dưỡng.',
          'Đội ngũ chuyên môn sẽ lắng nghe, đánh giá thể trạng và hướng dẫn chế độ dinh dưỡng phù hợp với nhu cầu riêng của mỗi người bệnh.',
        ],
      },
    ],
  }),
  content({
    id: 'GUIDE-008',
    kind: 'GUIDE',
    slug: 'tam-quan-trong-cua-viec-uong-du-nuoc',
    title: 'Tầm quan trọng của việc uống đủ nước mỗi ngày',
    excerpt: 'Một thói quen đơn giản có thể mang lại nhiều lợi ích cho sức khỏe.',
    category: CATEGORIES.nutrition,
    tags: [TAGS.selfCare],
    coverImage: GUIDE_IMAGES.nutrition2,
    publishedAt: '2026-08-28T07:00:00+07:00',
    readingMinutes: 6,
    featured: false,
    sections: [
      {
        heading: '1. Vì sao người bệnh cần uống đủ nước?',
        paragraphs: [
          'Cơ thể cần nước để vận chuyển chất dinh dưỡng, hỗ trợ tiêu hoá và đào thải các chất không cần thiết. Khi bị sốt, nôn, tiêu chảy hoặc ăn uống kém, lượng nước mất đi có thể nhiều hơn bình thường.',
          'Một số phương pháp điều trị có thể làm người bệnh khô miệng, thay đổi vị giác hoặc buồn nôn. Uống từng ngụm nhỏ, đều đặn trong ngày thường dễ chịu hơn so với uống một lượng lớn trong một lần.',
        ],
        image: {
          url: '/assets/images/guides/nutrition-02.png',
          alt: 'Người bệnh uống một cốc nước',
          width: 800,
          height: 450,
        },
        imageCaption: 'Nên chia lượng nước thành nhiều lần uống trong ngày',
      },
      {
        heading: '2. Lượng nước phù hợp là bao nhiêu?',
        paragraphs: [
          'Không có một con số phù hợp cho tất cả mọi người. Nhu cầu nước phụ thuộc vào cân nặng, thời tiết, mức vận động, loại thuốc đang sử dụng và tình trạng tim, gan hoặc thận.',
          'Người bệnh nên hỏi bác sĩ hoặc chuyên gia dinh dưỡng về lượng nước phù hợp nếu đang phù, suy tim, suy thận, có dẫn lưu hoặc được yêu cầu kiểm soát lượng dịch.',
        ],
      },
      {
        heading: '3. Những dấu hiệu có thể liên quan đến thiếu nước',
        paragraphs: [
          'Cần chú ý sự thay đổi so với trạng thái thường ngày của người bệnh. Một số biểu hiện có thể gặp gồm:',
        ],
        bullets: [
          'Khát nhiều, khô miệng hoặc môi khô.',
          'Nước tiểu ít hơn, màu sẫm hơn hoặc đi tiểu thưa.',
          'Mệt mỏi, đau đầu, chóng mặt hoặc khó tập trung.',
          'Da khô, táo bón hoặc cảm giác yếu hơn bình thường.',
        ],
      },
      {
        heading: '4. Cách duy trì thói quen uống nước dễ dàng hơn',
        paragraphs: [
          'Chuẩn bị một bình nước có vạch chia giúp theo dõi lượng đã uống. Có thể đặt lời nhắc theo khung giờ và để nước trong tầm nhìn, nhưng không nên cố uống khi bác sĩ đã chỉ định hạn chế dịch.',
        ],
        bullets: [
          'Uống từng ngụm nhỏ và tăng dần theo khả năng dung nạp.',
          'Thử nước ấm, nước mát hoặc thêm lát chanh nếu không kích ứng miệng và dạ dày.',
          'Bổ sung nước từ canh, súp, sữa hoặc trái cây nhiều nước khi phù hợp với chế độ ăn.',
          'Hạn chế đồ uống quá nhiều đường, caffeine hoặc cồn.',
        ],
        image: {
          url: '/assets/images/guides/nutrition-01.png',
          alt: 'Các loại rau củ và trái cây nhiều nước',
          width: 800,
          height: 533,
        },
        imageCaption: 'Thực phẩm cũng có thể đóng góp một phần lượng nước hằng ngày',
      },
      {
        heading: '5. Khi nào cần liên hệ nhân viên y tế?',
        paragraphs: [
          'Hãy liên hệ cơ sở điều trị khi người bệnh không thể uống hoặc giữ được nước, nôn hoặc tiêu chảy kéo dài, tiểu rất ít, chóng mặt nhiều, lơ mơ hoặc có dấu hiệu mất nước tăng nhanh.',
          'Gia đình nên ghi lại lượng nước uống, số lần nôn hoặc tiêu chảy và những thay đổi bất thường để cung cấp thông tin rõ ràng cho nhân viên y tế.',
        ],
      },
    ],
  }),
  content({
    id: 'GUIDE-009',
    kind: 'GUIDE',
    slug: 'bo-sung-protein-phu-hop',
    title: 'Cách bổ sung protein phù hợp cho người bệnh',
    excerpt: 'Những nguồn đạm dễ tiếp cận và lưu ý khi điều chỉnh khẩu phần ăn.',
    category: CATEGORIES.nutrition,
    tags: [TAGS.selfCare],
    coverImage: GUIDE_IMAGES.nutrition4,
    publishedAt: '2026-08-16T07:00:00+07:00',
    readingMinutes: 5,
    featured: false,
    sections: practicalGuide({
      overview:
        'Protein hỗ trợ duy trì khối cơ, tái tạo mô và phục hồi sau điều trị. Nhu cầu thực tế phụ thuộc vào thể trạng, chức năng gan thận và khả năng ăn uống của mỗi người.',
      keyPoints: [
        'Nguồn đạm gồm cá, thịt nạc, trứng, sữa, đậu hũ, đậu đỗ và các loại hạt.',
        'Ưu tiên món mềm, ít mùi hoặc để nguội bớt khi người bệnh nhạy cảm với mùi thức ăn.',
        'Không tự dùng bột đạm hoặc sản phẩm bổ sung khi chưa được tư vấn.',
      ],
      actions: [
        'Thêm một phần đạm nhỏ vào mỗi bữa thay vì dồn vào một bữa lớn.',
        'Làm giàu món ăn bằng trứng, sữa, đậu hũ hoặc bơ hạt nếu phù hợp.',
        'Theo dõi khẩu phần và cân nặng để trao đổi với chuyên gia dinh dưỡng.',
      ],
      contactWhen:
        'Hãy hỏi bác sĩ hoặc chuyên gia dinh dưỡng khi người bệnh sụt cân, ăn rất ít, khó nuốt hoặc có bệnh gan, thận cần giới hạn lượng đạm.',
    }),
  }),
  content({
    id: 'GUIDE-010',
    kind: 'GUIDE',
    slug: 'dau-hieu-am-tham-khi-ngu',
    title: 'Các dấu hiệu âm thầm khi ngủ cảnh báo ung thư',
    excerpt:
      'Những lưu ý giúp cơ thể duy trì năng lượng và thích nghi tốt hơn với quá trình điều trị.',
    category: CATEGORIES.signs,
    tags: [TAGS.beginner, TAGS.reference],
    coverImage: GUIDE_IMAGES.signs1,
    publishedAt: '2026-08-29T07:00:00+07:00',
    readingMinutes: 8,
    featured: false,
    detailLead:
      'Những thay đổi xuất hiện khi ngủ có thể liên quan đến đau, hô hấp, nội tiết hoặc nhiều vấn đề sức khỏe khác. Một dấu hiệu đơn lẻ không đủ để kết luận ung thư, nhưng việc nhận biết và ghi lại triệu chứng sẽ giúp buổi khám đầy đủ hơn.',
    sections: [
      {
        paragraphs: [],
        image: GUIDE_DETAIL_IMAGES.sleepOverview,
      },
      {
        heading: 'Các cơn đau mãn tính cảnh báo ung thư',
        paragraphs: [
          'Đau kéo dài hoặc thường xuyên đánh thức giấc ngủ cần được theo dõi, đặc biệt khi mức đau tăng dần, xuất hiện ở vị trí mới hoặc không cải thiện sau nghỉ ngơi. Đau có nhiều nguyên nhân và chỉ có nhân viên y tế mới có thể đánh giá chính xác.',
        ],
      },
      {
        heading: 'Ho khan kéo dài không dứt',
        paragraphs: [
          'Ho về đêm có thể do dị ứng, trào ngược, nhiễm trùng hoặc bệnh hô hấp. Hãy đi khám khi ho kéo dài, ngày càng nặng hoặc kèm khó thở, đau ngực, sốt hay ho ra máu.',
        ],
        image: GUIDE_DETAIL_IMAGES.persistentCough,
      },
      {
        heading: 'Đổ mồ hôi đêm liên tục',
        paragraphs: [
          'Phòng ngủ nóng, thay đổi nội tiết và một số loại thuốc đều có thể gây đổ mồ hôi đêm. Nếu tình trạng làm ướt quần áo hoặc chăn, lặp lại nhiều đêm và đi cùng sốt hay sụt cân ngoài ý muốn, người bệnh nên trao đổi với bác sĩ.',
        ],
        image: GUIDE_DETAIL_IMAGES.nightSweats,
      },
      {
        heading: 'Thường xuyên bị chuột rút ở chân',
        paragraphs: [
          'Chuột rút có thể liên quan đến vận động, mất nước, rối loạn điện giải hoặc thuốc đang dùng. Cần khám sớm nếu đau kéo dài, chân sưng đỏ, yếu cơ, tê bì hoặc triệu chứng xuất hiện với tần suất tăng dần.',
        ],
        image: GUIDE_DETAIL_IMAGES.legCramps,
      },
      {
        heading: 'Đi tiểu đêm liên tục',
        paragraphs: [
          'Uống nhiều nước gần giờ ngủ, thuốc lợi tiểu, rối loạn đường huyết hoặc bệnh tiết niệu đều có thể làm tăng số lần đi tiểu đêm. Nên ghi lại tần suất và đi khám nếu tình trạng kéo dài hoặc kèm đau buốt, tiểu máu, sốt hay đau vùng hông lưng.',
        ],
        image: GUIDE_DETAIL_IMAGES.nocturia,
      },
    ],
  }),
  content({
    id: 'GUIDE-011',
    kind: 'GUIDE',
    slug: 'can-bat-thuong-du-khong-an-kieng',
    title: 'Sụt cân bất thường dù không ăn kiêng',
    excerpt:
      'Tình trạng giảm cân nhanh mà không rõ nguyên nhân có thể là dấu hiệu cho thấy cơ thể đang gặp vấn đề sức khỏe.',
    category: CATEGORIES.signs,
    tags: [TAGS.beginner, TAGS.reference],
    coverImage: GUIDE_IMAGES.signs2,
    publishedAt: '2026-08-21T07:00:00+07:00',
    readingMinutes: 4,
    featured: false,
    sections: practicalGuide({
      overview:
        'Cân nặng có thể thay đổi do nhiều nguyên nhân. Sụt cân ngoài ý muốn cần được đánh giá khi diễn ra nhanh, liên tục hoặc không liên quan đến thay đổi ăn uống và vận động.',
      keyPoints: [
        'Theo dõi cả cân nặng, khẩu vị, tiêu hóa, mức vận động và tình trạng mệt mỏi.',
        'Cân vào cùng thời điểm và trong điều kiện tương tự để số liệu dễ so sánh.',
        'Không tự áp dụng chế độ tăng cân hoặc thực phẩm bổ sung chưa được tư vấn.',
      ],
      actions: [
        'Ghi cân nặng mỗi tuần thay vì cân nhiều lần trong ngày.',
        'Ghi lại lượng ăn và các triệu chứng như đau, buồn nôn hoặc khó nuốt.',
        'Chuẩn bị danh sách thuốc và bệnh sử khi đi khám.',
      ],
      contactWhen:
        'Hãy đi khám nếu sụt cân rõ rệt trong thời gian ngắn, ăn kém kéo dài, khó nuốt, nôn, tiêu chảy hoặc có dấu hiệu mất nước.',
    }),
  }),
  content({
    id: 'GUIDE-012',
    kind: 'GUIDE',
    slug: 'thay-doi-bat-thuong-trong-thoi-quen-bai-tiet',
    title: 'Những thay đổi bất thường trong thói quen bài tiết',
    excerpt:
      'Các thay đổi kéo dài trong sinh hoạt hằng ngày có thể là dấu hiệu cảnh báo mà cơ thể đang gửi tới bạn.',
    category: CATEGORIES.signs,
    tags: [TAGS.beginner, TAGS.reference],
    coverImage: GUIDE_IMAGES.signs3,
    publishedAt: '2026-08-14T07:00:00+07:00',
    readingMinutes: 5,
    featured: false,
    sections: practicalGuide({
      overview:
        'Thay đổi đại tiện hoặc tiểu tiện có thể liên quan đến chế độ ăn, thuốc, nhiễm trùng và nhiều bệnh lý khác. Điều quan trọng là nhận biết thay đổi kéo dài so với thói quen bình thường.',
      keyPoints: [
        'Chú ý tần suất, màu sắc, đau, khó đi, cảm giác chưa hết và dấu hiệu có máu.',
        'Ghi nhận thời điểm bắt đầu và mối liên quan với thuốc hoặc bữa ăn.',
        'Không tự dùng thuốc nhuận tràng hay kháng sinh kéo dài.',
      ],
      actions: [
        'Duy trì nước và chất xơ theo hướng dẫn phù hợp với tình trạng bệnh.',
        'Ghi nhật ký bài tiết trong vài ngày để cung cấp thông tin cụ thể cho bác sĩ.',
        'Chuẩn bị danh sách thuốc, thực phẩm bổ sung và bệnh nền.',
      ],
      contactWhen:
        'Cần khám sớm khi có máu, phân đen, bí tiểu, đau dữ dội, sốt hoặc thay đổi kéo dài nhiều tuần mà không rõ nguyên nhân.',
    }),
  }),
  content({
    id: 'GUIDE-013',
    kind: 'GUIDE',
    slug: 'ho-keo-dai-khong-cai-thien',
    title: 'Ho kéo dài không cải thiện theo thời gian',
    excerpt:
      'Nếu tình trạng ho kéo dài nhiều tuần hoặc đi kèm các triệu chứng bất thường khác, bạn nên chủ động thăm khám.',
    category: CATEGORIES.signs,
    tags: [TAGS.beginner, TAGS.reference],
    coverImage: GUIDE_IMAGES.signs4,
    publishedAt: '2026-08-08T07:00:00+07:00',
    readingMinutes: 5,
    featured: false,
    sections: practicalGuide({
      overview:
        'Ho thường do nhiễm trùng, dị ứng hoặc kích ứng đường thở. Tuy vậy, cơn ho kéo dài hoặc thay đổi bất thường cần được bác sĩ đánh giá để tìm nguyên nhân.',
      keyPoints: [
        'Theo dõi thời gian ho, ho khan hay có đờm và yếu tố làm ho tăng.',
        'Chú ý đau ngực, khàn tiếng, khó thở, sốt, sụt cân hoặc ho ra máu.',
        'Không tự dùng kháng sinh hoặc thuốc giảm ho trong thời gian dài.',
      ],
      actions: [
        'Tránh khói thuốc, bụi và mùi gây kích ứng; giữ không gian thông thoáng.',
        'Uống nước phù hợp và ghi lại tần suất, thời điểm xuất hiện cơn ho.',
        'Đem danh sách thuốc và bệnh sử hô hấp khi đi khám.',
      ],
      contactWhen:
        'Cần cấp cứu nếu khó thở nhiều, tím tái, đau ngực dữ dội hoặc ho ra nhiều máu; nên đi khám khi ho kéo dài nhiều tuần hoặc tăng dần.',
    }),
  }),
  content({
    id: 'GUIDE-014',
    kind: 'GUIDE',
    slug: 'hoa-tri-la-gi-va-dien-ra-nhu-the-nao',
    title: 'Hóa trị là gì và diễn ra như thế nào?',
    excerpt:
      'Tìm hiểu về phương pháp sử dụng thuốc để tiêu diệt hoặc kiểm soát sự phát triển của tế bào ung thư.',
    category: CATEGORIES.treatment,
    tags: [TAGS.beginner],
    coverImage: GUIDE_IMAGES.treatment2,
    publishedAt: '2026-08-26T07:00:00+07:00',
    readingMinutes: 7,
    featured: false,
    sections: practicalGuide({
      overview:
        'Hóa trị sử dụng thuốc để tiêu diệt hoặc kiểm soát tế bào ung thư. Thuốc có thể được truyền, uống hoặc dùng bằng đường khác theo phác đồ riêng của từng người.',
      keyPoints: [
        'Mục tiêu có thể là chữa bệnh, giảm nguy cơ tái phát, kiểm soát bệnh hoặc giảm triệu chứng.',
        'Tác dụng phụ phụ thuộc loại thuốc, liều và thể trạng; không phải ai cũng gặp giống nhau.',
        'Không tự ngừng, đổi liều hoặc dùng thêm thuốc khi chưa hỏi bác sĩ.',
      ],
      actions: [
        'Lưu lịch điều trị, xét nghiệm và số điện thoại của đơn vị phụ trách.',
        'Ghi lại tác dụng phụ, nhiệt độ cơ thể và khả năng ăn uống sau mỗi đợt.',
        'Thực hiện hướng dẫn phòng nhiễm trùng và dùng thuốc hỗ trợ đúng đơn.',
      ],
      contactWhen:
        'Liên hệ ngay cơ sở điều trị nếu sốt theo ngưỡng bác sĩ đã dặn, rét run, khó thở, chảy máu, nôn không kiểm soát hoặc lơ mơ.',
    }),
  }),
  content({
    id: 'GUIDE-015',
    kind: 'GUIDE',
    slug: 'dieu-tri-dich-va-nhung-dieu-can-biet',
    title: 'Điều trị đích và những điều cần biết',
    excerpt:
      'Một phương pháp hiện đại giúp tác động chính xác vào các đặc điểm riêng của tế bào ung thư.',
    category: CATEGORIES.treatment,
    tags: [TAGS.beginner],
    coverImage: GUIDE_IMAGES.treatment3,
    publishedAt: '2026-08-25T07:00:00+07:00',
    readingMinutes: 8,
    featured: false,
    sections: practicalGuide({
      overview:
        'Điều trị đích tác động vào một đặc điểm cụ thể giúp tế bào ung thư phát triển. Việc lựa chọn thường dựa trên loại ung thư và kết quả xét nghiệm dấu ấn sinh học.',
      keyPoints: [
        'Không phải mọi khối u đều có đích phù hợp với thuốc hiện có.',
        'Thuốc đích vẫn có thể gây tác dụng phụ và cần được theo dõi định kỳ.',
        'Hiệu quả điều trị được đánh giá bằng khám, xét nghiệm và chẩn đoán hình ảnh.',
      ],
      actions: [
        'Hỏi bác sĩ về mục tiêu, bằng chứng xét nghiệm và thời gian dự kiến của điều trị.',
        'Dùng thuốc đúng giờ, đúng liều và báo trước khi dùng thêm sản phẩm khác.',
        'Ghi lại triệu chứng da, tiêu hóa, huyết áp hoặc thay đổi bất thường.',
      ],
      contactWhen:
        'Liên hệ đội ngũ điều trị khi phát ban lan rộng, khó thở, đau ngực, tiêu chảy nhiều, chảy máu hoặc bất kỳ dấu hiệu nặng lên nhanh chóng.',
    }),
  }),
  content({
    id: 'GUIDE-016',
    kind: 'GUIDE',
    slug: 'theo-doi-suc-khoe-va-tac-dung-phu',
    title: 'Theo dõi sức khỏe và tác dụng phụ điều trị',
    excerpt:
      'Nhận biết các thay đổi của cơ thể để kịp thời trao đổi với bác sĩ và có hướng xử lý phù hợp.',
    category: CATEGORIES.care,
    tags: [TAGS.selfCare, TAGS.family],
    coverImage: GUIDE_IMAGES.care3,
    publishedAt: '2026-08-26T07:00:00+07:00',
    readingMinutes: 6,
    featured: false,
    sections: practicalGuide({
      overview:
        'Theo dõi có hệ thống giúp người bệnh mô tả tác dụng phụ rõ hơn và giúp bác sĩ điều chỉnh chăm sóc kịp thời. Không cần ghi quá nhiều, chỉ cần đều đặn và dễ hiểu.',
      keyPoints: [
        'Ghi thời điểm, mức độ, thời gian kéo dài và yếu tố làm triệu chứng tốt hoặc xấu hơn.',
        'Theo dõi nhiệt độ, ăn uống, bài tiết, đau, giấc ngủ và khả năng vận động khi được yêu cầu.',
        'Phân biệt triệu chứng có thể chờ đến lịch hẹn và dấu hiệu cần gọi ngay theo hướng dẫn của cơ sở điều trị.',
      ],
      actions: [
        'Dùng một mẫu theo dõi cố định trên giấy hoặc điện thoại.',
        'Mang bản ghi và danh sách thuốc đến mỗi lần tái khám.',
        'Chia sẻ với người chăm sóc các dấu hiệu cảnh báo và số điện thoại cần liên hệ.',
      ],
      contactWhen:
        'Gọi cơ sở điều trị khi triệu chứng vượt ngưỡng đã được dặn; cấp cứu nếu khó thở, đau ngực, lơ mơ, co giật, chảy máu nhiều hoặc phản ứng dị ứng nặng.',
    }),
  }),
  content({
    id: 'STORY-001',
    kind: 'STORY',
    slug: 'mot-ngay-mot-buoc-nho',
    title: 'Mỗi ngày là một bước nhỏ',
    excerpt:
      'Một thành viên kể lại cách mình học cách đón nhận sự giúp đỡ trong hành trình điều trị.',
    category: CATEGORIES.patientStory,
    tags: [TAGS.hope],
    coverImage: IMAGES.story,
    publishedAt: '2026-08-30T08:00:00+07:00',
    readingMinutes: 8,
    featured: true,
    authorName: 'Thành viên Trạm K',
  }),
  content({
    id: 'STORY-002',
    kind: 'STORY',
    slug: 'nguoi-dong-hanh-khong-can-noi-qua-nhieu',
    title: 'Người đồng hành không cần nói quá nhiều',
    excerpt: 'Câu chuyện về sự hiện diện, lắng nghe và những việc nhỏ có thể làm cho người thân.',
    category: CATEGORIES.companionStory,
    tags: [TAGS.family, TAGS.hope],
    coverImage: IMAGES.family,
    publishedAt: '2026-08-20T08:00:00+07:00',
    readingMinutes: 7,
    featured: false,
    authorName: 'Người chăm sóc tại Trạm K',
  }),
  content({
    id: 'STORY-003',
    kind: 'STORY',
    slug: 'hy-vong-tu-cong-dong',
    title: 'Hy vọng được tiếp sức từ cộng đồng',
    excerpt: 'Những kết nối nhỏ đã giúp một gia đình cảm thấy không còn đơn độc.',
    category: CATEGORIES.patientStory,
    tags: [TAGS.hope],
    coverImage: IMAGES.story,
    publishedAt: '2026-08-10T08:00:00+07:00',
    readingMinutes: 6,
    featured: false,
    authorName: 'Thành viên Trạm K',
  }),
  ...(['ung-thu-vu', 'ung-thu-phoi', 'ung-thu-gan', 'ung-thu-dai-truc-trang'] as const).map(
    (slug, index) =>
      content({
        id: `CANCER-${String(index + 1).padStart(3, '0')}`,
        kind: 'CANCER_TYPE' as ContentKind,
        slug,
        title: ['Ung thư vú', 'Ung thư phổi', 'Ung thư gan', 'Ung thư đại trực tràng'][index],
        excerpt:
          'Trang tra cứu tổng quan, dấu hiệu cần lưu ý và các câu hỏi nên trao đổi với nhân viên y tế.',
        category: CATEGORIES.cancerInfo,
        tags: [TAGS.reference, TAGS.beginner],
        coverImage: IMAGES.cancer,
        publishedAt: `2026-07-${String(28 - index).padStart(2, '0')}T08:00:00+07:00`,
        readingMinutes: 8,
        featured: index === 0,
      }),
  ),
  content({
    id: 'GUIDE-DRAFT-001',
    kind: 'GUIDE',
    slug: 'noi-dung-dang-cho-kiem-duyet',
    title: 'Nội dung đang chờ kiểm duyệt',
    excerpt: 'Bản nháp dùng để kiểm tra rằng nội dung chưa xuất bản không xuất hiện với khách.',
    category: CATEGORIES.care,
    tags: [],
    coverImage: IMAGES.family,
    publishedAt: '2026-09-02T08:00:00+07:00',
    readingMinutes: 3,
    featured: false,
    status: 'DRAFT',
  }),
];
