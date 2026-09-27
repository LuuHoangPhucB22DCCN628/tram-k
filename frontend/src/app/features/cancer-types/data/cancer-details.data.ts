import { CancerDetail } from '../models/cancer-type.models';

export const CANCER_DETAILS: Readonly<Record<string, CancerDetail>> = {
  'ung-thu-vu': {
    slug: 'ung-thu-vu',
    name: 'Ung thư vú',
    tagline: 'Những điều bạn cần biết',
    intro:
      'Ung thư vú hiện là một trong những loại ung thư phổ biến nhất ở phụ nữ và cũng là nguyên nhân gây tử vong hàng đầu do ung thư ở nữ giới. Tuy nhiên, các chuyên gia cho biết bệnh hoàn toàn có thể được kiểm soát và điều trị hiệu quả nếu được phát hiện ở giai đoạn sớm.',
    heroImage: '/assets/images/cancer-types/details/breast/hero.svg',
    heroAlt: 'Minh họa hành trình tìm hiểu và điều trị ung thư vú',
    theme: 'breast',
    signs: {
      title: 'Những dấu hiệu',
      subtitle: 'không thể bỏ qua',
      intro:
        'Các triệu chứng ban đầu của ung thư vú thường không rõ ràng, dễ bị nhầm lẫn với những vấn đề sức khỏe thông thường. Một số dấu hiệu cảnh báo gồm:',
      items: [
        'Đau âm ỉ hoặc nóng rát vùng ngực kéo dài.',
        'Da vùng vú xuất hiện nếp nhăn, lõm bất thường hoặc thay đổi màu sắc.',
        'Xuất hiện khối u hoặc hạch sưng ở nách.',
        'Đau lưng, đau vai hoặc vùng giữa hai bả vai không rõ nguyên nhân.',
      ],
    },
    risks: {
      title: 'Nguyên nhân',
      subtitle: 'và các yếu tố nguy cơ',
      intro:
        'Mặc dù chưa xác định được nguyên nhân chính xác gây ung thư vú, nhiều yếu tố được ghi nhận có liên quan đến nguy cơ mắc bệnh. Trong đó có tiền sử gia đình có người mắc ung thư vú, sinh con muộn hoặc không sinh con, không cho con bú, dậy thì sớm, mãn kinh muộn và tiền sử các bệnh lý tuyến vú.',
      items: [
        'Ngoài ra, lối sống thiếu lành mạnh như hút thuốc lá, uống rượu bia, béo phì, ít vận động và thường xuyên tiếp xúc với môi trường ô nhiễm cũng làm gia tăng nguy cơ mắc bệnh.',
      ],
    },
    stages: {
      title: 'Các giai đoạn của bệnh',
      intro:
        'Ung thư vú được chia thành 5 giai đoạn từ 0 đến 4. Ở giai đoạn 0 và giai đoạn 1, tế bào ung thư còn khu trú trong tuyến vú và khả năng điều trị thành công rất cao. Khi bệnh tiến triển đến giai đoạn 3 hoặc 4, tế bào ung thư có thể lan sang hạch bạch huyết và các cơ quan khác như xương, gan, phổi hoặc não, khiến việc điều trị trở nên khó khăn hơn.',
      items: [
        'Theo các chuyên gia, khoảng 80% bệnh nhân có thể được chữa khỏi nếu phát hiện bệnh từ những giai đoạn đầu.',
      ],
    },
    treatment: {
      title: 'Điều trị',
      subtitle: 'bằng nhiều phương pháp kết hợp',
      intro:
        'Tùy từng giai đoạn, bác sĩ có thể chỉ định các phương pháp điều trị khác nhau như phẫu thuật cắt bỏ khối u hoặc tuyến vú, xạ trị và hóa trị. Trong nhiều trường hợp, các phương pháp này được phối hợp nhằm tăng hiệu quả điều trị và hạn chế nguy cơ tái phát.',
      items: [],
    },
    prevention: {
      title: '“chìa khóa”',
      intro:
        'Các chuyên gia khuyến cáo phụ nữ nên duy trì lối sống lành mạnh, tăng cường rau xanh, tập luyện thể thao thường xuyên và hạn chế các yếu tố nguy cơ như thuốc lá, rượu bia. Đặc biệt, việc khám sức khỏe định kỳ và tầm soát ung thư vú đóng vai trò quan trọng trong phát hiện sớm bệnh.',
      items: [
        'Việc chủ động theo dõi sức khỏe và nhận biết sớm các dấu hiệu bất thường không chỉ giúp nâng cao hiệu quả điều trị mà còn góp phần bảo vệ chất lượng cuộc sống cho người bệnh.',
      ],
    },
  },
  'ung-thu-phoi': {
    slug: 'ung-thu-phoi',
    name: 'Ung thư phổi',
    tagline: 'Kẻ giết người thầm lặng',
    intro:
      'Ung thư phổi là một trong những căn bệnh ác tính có tỷ lệ mắc và tử vong cao nhất tại Việt Nam. Với đặc tính tiến triển âm thầm, việc trang bị kiến thức về các dấu hiệu cảnh báo, yếu tố nguy cơ và các phương pháp điều trị sẽ giúp chúng ta chủ động hơn trong cuộc chiến bảo vệ lá phổi của mình.',
    heroImage: '/assets/images/cancer-types/details/lung-hero.svg',
    heroAlt: 'Minh họa lá phổi và các yếu tố ảnh hưởng đến sức khỏe hô hấp',
    theme: 'lung',
  },
  'ung-thu-tuyen-giap': {
    slug: 'ung-thu-tuyen-giap',
    name: 'Ung thư tuyến giáp',
    tagline: 'Hiểu bệnh, hiểu mình, hiểu hành trình phía trước',
    intro:
      'Ung thư tuyến giáp là một trong những bệnh lý ác tính về nội tiết phổ biến nhất, với tỷ lệ mắc đang có xu hướng gia tăng tại Việt Nam, đặc biệt ở nữ giới. Tuy nhiên, đây lại là căn bệnh có tiên lượng vô cùng tích cực nếu được phát hiện sớm. Việc trang bị kiến thức về các dấu hiệu cảnh báo, yếu tố nguy cơ và phương pháp điều trị sẽ giúp chúng ta chủ động làm chủ sức khỏe và bảo vệ tuyến giáp của mình.',
    heroImage: '/assets/images/cancer-types/details/thyroid-hero.svg',
    heroAlt: 'Minh họa cơ thể người và vị trí tuyến giáp',
    theme: 'thyroid',
  },
  'ung-thu-co-tu-cung': {
    slug: 'ung-thu-co-tu-cung',
    name: 'Ung thư cổ tử cung',
    tagline: 'Nguyên nhân, triệu chứng, chẩn đoán và điều trị',
    intro:
      'Tại Việt Nam, tỷ lệ nguy cơ nhiễm virus HPV ít nhất một lần ở nữ giới lên đến 80%. Mặc dù nguy hiểm, bệnh hoàn toàn có thể phòng tránh hoặc điều trị hiệu quả nếu được phát hiện sớm.',
    heroImage: '/assets/images/cancer-types/cervical.png',
    heroAlt: 'Minh họa chăm sóc sức khỏe cổ tử cung',
    theme: 'cervical',
    layout: 'article',
    articleTitle: 'Ung thư cổ tử cung: Nguyên nhân, triệu chứng, chẩn đoán và điều trị',
    publishedAt: '27 Tháng 6, 2025',
    readingTime: '8 phút đọc',
    articleSections: [
      {
        title: 'Tìm hiểu chung ung thư cổ tử cung',
        paragraphs: [
          'Ung thư cổ tử cung là bệnh lý ác tính xuất phát từ các tế bào tại phần dưới của tử cung, nơi kết nối với âm đạo. Nguyên nhân chính là nhiễm dai dẳng virus HPV (Human Papillomavirus), đặc biệt là các chủng nguy cơ cao HPV 16 và HPV 18.',
          'HPV chủ yếu lây truyền qua đường tình dục. Trong phần lớn trường hợp, hệ miễn dịch có thể tự loại bỏ virus; khi nhiễm kéo dài, tế bào cổ tử cung có thể dần biến đổi và tiến triển thành tổn thương tiền ung thư hoặc ung thư.',
        ],
        image: '/assets/images/cancer-types/details/cervical/stages.png',
        imageAlt: 'Minh họa các giai đoạn phát triển của ung thư cổ tử cung',
      },
      {
        title: 'Những triệu chứng của ung thư cổ tử cung',
        paragraphs: [
          'Bệnh thường diễn tiến thầm lặng và triệu chứng ban đầu khó nhận biết. Những dấu hiệu cần lưu ý gồm dịch tiết âm đạo bất thường, tiểu gấp hoặc tiểu rắt, chảy máu âm đạo ngoài kỳ kinh, đau vùng chậu và chân sưng đau kéo dài.',
          'Khi xuất hiện biểu hiện bất thường, phụ nữ nên gặp bác sĩ phụ khoa để được thăm khám. Không nên đợi tới khi triệu chứng rõ ràng vì khi đó bệnh có thể đã tiến triển.',
        ],
        image: '/assets/images/cancer-types/details/cervical/examination.png',
        imageAlt: 'Bác sĩ tư vấn và thăm khám sức khỏe cổ tử cung',
      },
      {
        title: 'Tác động của ung thư cổ tử cung đối với sức khỏe',
        paragraphs: [
          'Nếu không được điều trị sớm, khối u có thể phát triển, lan rộng hoặc di căn và gây ra nhiều biến chứng như chảy máu, suy giảm khả năng sinh sản, ảnh hưởng chức năng thận và tác động đáng kể tới sức khỏe tinh thần.',
          'Việc phát hiện sớm giúp bác sĩ có thêm lựa chọn điều trị và tăng khả năng bảo tồn chất lượng cuộc sống cho người bệnh.',
        ],
      },
      {
        title: 'Nguyên nhân ung thư cổ tử cung',
        paragraphs: [
          'Nguyên nhân chính là nhiễm HPV nguy cơ cao kéo dài. Các yếu tố khác có thể làm tăng nguy cơ gồm bắt đầu quan hệ tình dục sớm, có nhiều bạn tình, suy giảm miễn dịch, hút thuốc lá và dinh dưỡng không cân bằng.',
          'Tiêm vaccine HPV, quan hệ tình dục an toàn và thực hiện xét nghiệm sàng lọc theo hướng dẫn của bác sĩ là những biện pháp quan trọng để chủ động phòng bệnh.',
        ],
        image: '/assets/images/cancer-types/details/cervical/cancer-cell.png',
        imageAlt: 'Minh họa tế bào ung thư tại cổ tử cung',
      },
    ],
    signs: {
      title: 'Những triệu chứng',
      intro: 'Các dấu hiệu bất thường cần được bác sĩ chuyên khoa đánh giá.',
      items: [
        'Chảy máu âm đạo bất thường.',
        'Dịch tiết âm đạo thay đổi.',
        'Đau vùng chậu.',
        'Tiểu tiện bất thường.',
      ],
    },
    risks: {
      title: 'Yếu tố nguy cơ',
      intro: 'Nhiễm HPV nguy cơ cao kéo dài là nguyên nhân chính.',
      items: [
        'HPV 16 hoặc HPV 18.',
        'Suy giảm miễn dịch.',
        'Hút thuốc lá.',
        'Không sàng lọc định kỳ.',
      ],
    },
    stages: {
      title: 'Các giai đoạn',
      intro: 'Bệnh được đánh giá dựa trên mức độ lan rộng của tổn thương.',
      items: ['Tổn thương tiền ung thư.', 'Bệnh khu trú.', 'Bệnh lan tại vùng.', 'Bệnh di căn.'],
    },
    treatment: {
      title: 'Chẩn đoán và điều trị',
      intro: 'Phác đồ phụ thuộc giai đoạn bệnh và tình trạng của từng người.',
      items: [
        'Sàng lọc và sinh thiết.',
        'Phẫu thuật.',
        'Xạ trị.',
        'Hóa trị hoặc điều trị phối hợp.',
      ],
    },
    prevention: {
      title: 'Phòng ngừa',
      intro: 'Chủ động dự phòng giúp giảm đáng kể nguy cơ mắc bệnh.',
      items: ['Tiêm vaccine HPV.', 'Sàng lọc định kỳ.', 'Quan hệ tình dục an toàn.'],
    },
  },
  'ung-thu-dai-truc-trang': {
    slug: 'ung-thu-dai-truc-trang',
    name: 'Ung thư đại trực tràng',
    tagline: 'Dấu hiệu, yếu tố nguy cơ, chẩn đoán và phòng ngừa',
    intro:
      'Ung thư đại trực tràng hình thành tại đại tràng hoặc trực tràng và thường bắt đầu từ những polyp trong niêm mạc. Bệnh có thể chưa gây triệu chứng ở giai đoạn sớm, vì vậy nhận biết dấu hiệu và tầm soát đúng thời điểm rất quan trọng.',
    heroImage: '/assets/images/cancer-types/colorectal.png',
    heroAlt: 'Minh họa đại tràng, trực tràng và quá trình thăm khám',
    theme: 'colorectal',
    layout: 'article',
    articleTitle: 'Ung thư đại trực tràng: Dấu hiệu, yếu tố nguy cơ và cách phòng ngừa',
    publishedAt: '11 Tháng 9, 2026',
    readingTime: '7 phút đọc',
    articleSections: [
      {
        title: 'Tìm hiểu chung về ung thư đại trực tràng',
        paragraphs: [
          'Ung thư đại trực tràng là bệnh lý ác tính xuất hiện ở đại tràng hoặc trực tràng, hai bộ phận thuộc hệ tiêu hóa. Nhiều trường hợp bắt đầu từ polyp, là những tổn thương phát triển trên lớp niêm mạc và có thể biến đổi thành ung thư theo thời gian.',
          'Khả năng điều trị phụ thuộc nhiều vào giai đoạn phát hiện. Tầm soát có thể giúp nhận biết và loại bỏ một số tổn thương tiền ung thư trước khi chúng tiến triển, đồng thời tăng cơ hội phát hiện bệnh ở giai đoạn sớm.',
        ],
        image: '/assets/images/cancer-types/colorectal.png',
        imageAlt: 'Minh họa vị trí đại tràng và trực tràng trong hệ tiêu hóa',
      },
      {
        title: 'Những dấu hiệu cần lưu ý',
        paragraphs: [
          'Các biểu hiện có thể gồm thay đổi thói quen đại tiện kéo dài như tiêu chảy, táo bón hoặc cảm giác đi ngoài không hết; phân có máu đỏ tươi, sẫm màu hoặc hình dạng khác thường; đau quặn, đầy bụng hay khó chịu ở bụng dai dẳng.',
          'Sụt cân không rõ nguyên nhân, mệt mỏi kéo dài và thiếu máu thiếu sắt cũng có thể xuất hiện do chảy máu mạn tính. Những dấu hiệu này còn gặp trong nhiều bệnh khác, do đó người bệnh cần được bác sĩ thăm khám thay vì tự kết luận.',
        ],
      },
      {
        title: 'Yếu tố làm tăng nguy cơ mắc bệnh',
        paragraphs: [
          'Nguy cơ tăng theo tuổi, đặc biệt sau 50 tuổi, nhưng bệnh vẫn có thể gặp ở người trẻ. Tiền sử cá nhân có polyp hoặc ung thư đại trực tràng, bệnh viêm ruột kéo dài và tiền sử gia đình mắc bệnh là những yếu tố cần được trao đổi với bác sĩ.',
          'Một số hội chứng di truyền như Lynch hoặc đa polyp tuyến gia đình làm tăng đáng kể nguy cơ. Bên cạnh đó, chế độ ăn nhiều thịt đỏ và thịt chế biến sẵn, ít rau quả, ít vận động, thừa cân, hút thuốc và sử dụng nhiều đồ uống có cồn cũng có liên quan tới bệnh.',
        ],
      },
      {
        title: 'Chẩn đoán, tầm soát và phòng ngừa',
        paragraphs: [
          'Bác sĩ có thể chỉ định xét nghiệm phân, nội soi đại tràng hoặc đại tràng sigma và sinh thiết khi cần xác định chẩn đoán. Các phương tiện hình ảnh và xét nghiệm phân tử được lựa chọn tùy tình trạng để đánh giá mức độ lan rộng và xây dựng phác đồ điều trị.',
          'Chủ động ăn đa dạng rau quả, vận động thường xuyên, duy trì cân nặng phù hợp, không hút thuốc và hạn chế đồ uống có cồn có thể giúp giảm nguy cơ. Lịch tầm soát cần được cá thể hóa theo tuổi, tiền sử gia đình và mức nguy cơ của mỗi người.',
        ],
      },
    ],
    signs: {
      title: 'Những dấu hiệu',
      intro: 'Các thay đổi kéo dài ở đường tiêu hóa cần được bác sĩ đánh giá.',
      items: [
        'Máu trong phân hoặc phân sẫm màu.',
        'Thay đổi thói quen đại tiện kéo dài.',
        'Đau bụng, đầy bụng hoặc khó chịu dai dẳng.',
        'Sụt cân, mệt mỏi hoặc thiếu máu không rõ nguyên nhân.',
      ],
    },
    risks: {
      title: 'Yếu tố nguy cơ',
      intro: 'Tuổi, tiền sử cá nhân, gia đình và lối sống đều có thể ảnh hưởng tới nguy cơ.',
      items: [
        'Tuổi trên 50 hoặc có polyp đại trực tràng.',
        'Tiền sử gia đình hay hội chứng di truyền liên quan.',
        'Bệnh viêm ruột kéo dài.',
        'Ít vận động, hút thuốc, rượu bia hoặc thừa cân.',
      ],
    },
    stages: {
      title: 'Các giai đoạn',
      intro: 'Giai đoạn được xác định theo độ xâm lấn và mức độ lan rộng của bệnh.',
      items: [
        'Tổn thương còn khu trú ở lớp niêm mạc.',
        'Khối u xâm lấn thành ruột hoặc mô lân cận.',
        'Tế bào ung thư lan tới hạch vùng.',
        'Bệnh di căn tới cơ quan xa.',
      ],
    },
    treatment: {
      title: 'Chẩn đoán và điều trị',
      intro: 'Phác đồ phụ thuộc vị trí khối u, giai đoạn và thể trạng của từng người bệnh.',
      items: [
        'Nội soi, sinh thiết và xét nghiệm hình ảnh.',
        'Phẫu thuật khi phù hợp.',
        'Hóa trị, xạ trị hoặc điều trị phối hợp.',
        'Điều trị nhắm trúng đích hoặc miễn dịch khi có chỉ định.',
      ],
    },
    prevention: {
      title: 'Phòng ngừa và phát hiện sớm',
      intro: 'Lối sống lành mạnh và tầm soát phù hợp giúp chủ động bảo vệ sức khỏe.',
      items: [
        'Ăn nhiều rau quả và duy trì vận động.',
        'Không hút thuốc, hạn chế đồ uống có cồn.',
        'Trao đổi với bác sĩ để lựa chọn lịch và phương pháp tầm soát.',
      ],
    },
  },
  'ung-thu-gan': {
    slug: 'ung-thu-gan',
    name: 'Ung thư gan',
    tagline: 'Dấu hiệu, yếu tố nguy cơ, chẩn đoán và phòng ngừa',
    intro:
      'Ung thư gan nguyên phát hình thành từ các tế bào tại gan, trong đó ung thư biểu mô tế bào gan là thể phổ biến nhất ở người lớn. Bệnh thường liên quan tới tổn thương gan mạn tính và có thể tiến triển âm thầm trong giai đoạn đầu.',
    heroImage: '/assets/images/cancer-types/liver.png',
    heroAlt: 'Minh họa lá gan và quá trình thăm khám sức khỏe gan',
    theme: 'liver',
    layout: 'article',
    articleTitle: 'Ung thư gan: Dấu hiệu, yếu tố nguy cơ và cách chủ động phòng ngừa',
    publishedAt: '11 Tháng 9, 2026',
    readingTime: '7 phút đọc',
    articleSections: [
      {
        title: 'Tìm hiểu chung về ung thư gan',
        paragraphs: [
          'Ung thư gan nguyên phát là tình trạng tế bào ác tính hình thành trong mô gan. Ung thư biểu mô tế bào gan là thể thường gặp nhất; ngoài ra còn có ung thư đường mật trong gan và một số thể hiếm khác.',
          'Gan đảm nhiệm nhiều chức năng quan trọng như chuyển hóa chất dinh dưỡng, hỗ trợ loại bỏ độc chất và sản xuất các thành phần cần thiết cho cơ thể. Vì gan vẫn có thể hoạt động khi một phần mô đã tổn thương, bệnh ở giai đoạn sớm đôi khi chưa tạo ra biểu hiện rõ ràng.',
        ],
        image: '/assets/images/cancer-types/liver.png',
        imageAlt: 'Minh họa vị trí và cấu tạo của gan trong cơ thể',
      },
      {
        title: 'Những dấu hiệu cần lưu ý',
        paragraphs: [
          'Người bệnh có thể xuất hiện khối cứng hoặc cảm giác khó chịu ở vùng bụng trên bên phải, bụng to hoặc chướng, đau lan ra lưng hay vùng bả vai phải. Vàng da, vàng mắt, nước tiểu sẫm màu hoặc dễ bầm chảy máu cũng là những dấu hiệu cần được thăm khám.',
          'Các biểu hiện khác gồm chán ăn, nhanh no, buồn nôn, mệt mỏi, suy nhược, sốt hoặc sụt cân không rõ nguyên nhân. Những triệu chứng này không chỉ do ung thư gan gây ra, vì vậy cần được bác sĩ đánh giá và làm xét nghiệm phù hợp.',
        ],
      },
      {
        title: 'Yếu tố làm tăng nguy cơ mắc bệnh',
        paragraphs: [
          'Nhiễm virus viêm gan B hoặc viêm gan C mạn tính và xơ gan là những yếu tố nguy cơ quan trọng. Uống nhiều đồ uống có cồn trong thời gian dài có thể gây xơ gan; bệnh gan nhiễm mỡ liên quan rối loạn chuyển hóa cũng có thể dẫn đến viêm và tổn thương gan kéo dài.',
          'Nguy cơ còn liên quan tới hút thuốc, tiếp xúc với aflatoxin trong thực phẩm bảo quản không đúng cách và một số bệnh chuyển hóa hoặc di truyền hiếm. Có yếu tố nguy cơ không đồng nghĩa chắc chắn mắc bệnh, nhưng người thuộc nhóm nguy cơ cao nên trao đổi với bác sĩ về kế hoạch theo dõi.',
        ],
      },
      {
        title: 'Chẩn đoán, theo dõi và phòng ngừa',
        paragraphs: [
          'Bác sĩ có thể sử dụng xét nghiệm máu, siêu âm, chụp cắt lớp vi tính hoặc cộng hưởng từ để đánh giá gan. Một số trường hợp cần sinh thiết; kế hoạch chẩn đoán và điều trị được lựa chọn theo đặc điểm khối u, chức năng gan và sức khỏe tổng thể.',
          'Tiêm vaccine viêm gan B, phòng tránh lây nhiễm virus viêm gan, điều trị và theo dõi bệnh gan mạn tính, hạn chế đồ uống có cồn, không hút thuốc và duy trì cân nặng hợp lý là những biện pháp quan trọng. Người có nguy cơ cao cần tuân theo lịch theo dõi do bác sĩ chỉ định.',
        ],
      },
    ],
    signs: {
      title: 'Những dấu hiệu',
      intro: 'Các biểu hiện bất thường kéo dài cần được bác sĩ chuyên khoa đánh giá.',
      items: [
        'Đau hoặc có khối cứng vùng bụng trên bên phải.',
        'Vàng da, vàng mắt hoặc nước tiểu sẫm màu.',
        'Chán ăn, nhanh no, buồn nôn hoặc bụng chướng.',
        'Mệt mỏi và sụt cân không rõ nguyên nhân.',
      ],
    },
    risks: {
      title: 'Yếu tố nguy cơ',
      intro: 'Tổn thương gan mạn tính là nền tảng quan trọng làm tăng nguy cơ mắc bệnh.',
      items: [
        'Nhiễm viêm gan B hoặc viêm gan C mạn tính.',
        'Xơ gan do nhiều nguyên nhân.',
        'Sử dụng nhiều đồ uống có cồn hoặc hút thuốc.',
        'Gan nhiễm mỡ tiến triển hoặc phơi nhiễm aflatoxin.',
      ],
    },
    stages: {
      title: 'Đánh giá giai đoạn',
      intro: 'Bác sĩ đánh giá cả mức độ lan rộng của khối u và chức năng gan còn lại.',
      items: [
        'Khối u còn khu trú và chức năng gan được bảo tồn.',
        'Có nhiều tổn thương trong gan hoặc xâm lấn mạch máu.',
        'Bệnh lan tới hạch hay cấu trúc lân cận.',
        'Bệnh di căn tới cơ quan xa.',
      ],
    },
    treatment: {
      title: 'Chẩn đoán và điều trị',
      intro: 'Phác đồ được cá thể hóa theo khối u, chức năng gan và thể trạng người bệnh.',
      items: [
        'Phẫu thuật cắt gan hoặc ghép gan khi phù hợp.',
        'Đốt u hoặc can thiệp qua động mạch gan.',
        'Xạ trị trong những trường hợp được lựa chọn.',
        'Điều trị toàn thân bằng thuốc nhắm trúng đích hoặc miễn dịch khi có chỉ định.',
      ],
    },
    prevention: {
      title: 'Phòng ngừa và theo dõi',
      intro: 'Bảo vệ gan và quản lý bệnh gan mạn tính giúp giảm nguy cơ.',
      items: [
        'Tiêm vaccine viêm gan B và phòng tránh lây nhiễm virus viêm gan.',
        'Hạn chế đồ uống có cồn, không hút thuốc và duy trì cân nặng hợp lý.',
        'Theo dõi định kỳ theo chỉ định nếu thuộc nhóm nguy cơ cao.',
      ],
    },
  },
  'ung-thu-mau': {
    slug: 'ung-thu-mau',
    name: 'Ung thư máu',
    tagline: 'Nhận biết các nhóm bệnh, dấu hiệu và hướng chẩn đoán',
    intro:
      'Ung thư máu là cách gọi chung cho nhiều bệnh ác tính ảnh hưởng tới máu, tủy xương hoặc hệ bạch huyết. Mỗi nhóm bệnh có đặc điểm tiến triển và phương pháp điều trị khác nhau, vì vậy chẩn đoán chính xác thể bệnh là bước đặc biệt quan trọng.',
    heroImage: '/assets/images/cancer-types/blood.png',
    heroAlt: 'Minh họa tế bào máu và quá trình xét nghiệm',
    theme: 'blood',
    layout: 'article',
    articleTitle: 'Ung thư máu: Các nhóm bệnh, dấu hiệu và phương pháp điều trị',
    publishedAt: '11 Tháng 9, 2026',
    readingTime: '7 phút đọc',
    articleSections: [
      {
        title: 'Tìm hiểu chung về ung thư máu',
        paragraphs: [
          'Ung thư máu bao gồm nhiều bệnh ác tính của tế bào tạo máu và hệ bạch huyết. Các nhóm thường được nhắc tới là bệnh bạch cầu, u lympho và đa u tủy xương. Bệnh có thể ảnh hưởng tới khả năng tạo hồng cầu, bạch cầu hoặc tiểu cầu khỏe mạnh.',
          'Bệnh bạch cầu thường xuất hiện chủ yếu trong máu và tủy xương; u lympho ảnh hưởng tới tế bào lympho và hệ bạch huyết; đa u tủy hình thành từ các tương bào bất thường. Mỗi nhóm tiếp tục được chia thành nhiều thể cấp tính hoặc mạn tính với tốc độ tiến triển khác nhau.',
        ],
        image: '/assets/images/cancer-types/blood.png',
        imageAlt: 'Minh họa các tế bào máu và hệ tạo máu',
      },
      {
        title: 'Những dấu hiệu cần lưu ý',
        paragraphs: [
          'Khi tủy xương không tạo đủ tế bào máu khỏe mạnh, người bệnh có thể mệt mỏi, suy nhược, khó thở, da nhợt, dễ bầm tím hoặc chảy máu. Sốt không rõ nguyên nhân, nhiễm trùng tái diễn và đổ mồ hôi đêm cũng có thể xuất hiện.',
          'Một số người có hạch sưng không đau, đau xương hoặc khớp, cảm giác đầy dưới bờ sườn, sụt cân không chủ ý hay chán ăn. Các triệu chứng trên không đặc hiệu cho ung thư máu; nếu kéo dài hoặc tăng dần, người bệnh nên đi khám để xác định nguyên nhân.',
        ],
      },
      {
        title: 'Nguyên nhân và yếu tố nguy cơ',
        paragraphs: [
          'Phần lớn trường hợp không xác định được một nguyên nhân duy nhất. Một số yếu tố có liên quan tới từng thể bệnh gồm tuổi, bất thường di truyền, tiền sử điều trị bằng hóa trị hoặc xạ trị, phơi nhiễm bức xạ ion hóa hay một số hóa chất như benzen.',
          'Một số hội chứng di truyền và tình trạng suy giảm miễn dịch có thể làm tăng nguy cơ. Tuy nhiên, có yếu tố nguy cơ không có nghĩa chắc chắn sẽ mắc bệnh, và nhiều người được chẩn đoán dù không có yếu tố nguy cơ rõ ràng.',
        ],
      },
      {
        title: 'Chẩn đoán, phân loại và điều trị',
        paragraphs: [
          'Quá trình đánh giá có thể gồm khám lâm sàng, công thức máu, xét nghiệm tế bào máu ngoại vi, chọc hút hoặc sinh thiết tủy xương. Xét nghiệm miễn dịch, di truyền và phân tử giúp xác định chính xác dòng tế bào và thể bệnh để lựa chọn phác đồ.',
          'Điều trị có thể bao gồm hóa trị, thuốc nhắm trúng đích, liệu pháp miễn dịch, xạ trị hoặc ghép tế bào gốc tạo máu. Một số thể tiến triển chậm có thể được theo dõi chủ động trước khi cần điều trị. Quyết định luôn phụ thuộc vào thể bệnh, tuổi, sức khỏe tổng thể và đáp ứng của từng người.',
        ],
      },
    ],
    signs: {
      title: 'Những dấu hiệu',
      intro: 'Sự thiếu hụt tế bào máu khỏe mạnh có thể gây nhiều biểu hiện toàn thân.',
      items: [
        'Mệt mỏi, suy nhược, da nhợt hoặc khó thở.',
        'Dễ bầm tím, chảy máu hoặc xuất hiện chấm đỏ dưới da.',
        'Sốt, nhiễm trùng tái diễn hoặc đổ mồ hôi đêm.',
        'Hạch sưng, đau xương hoặc sụt cân không rõ nguyên nhân.',
      ],
    },
    risks: {
      title: 'Yếu tố nguy cơ',
      intro: 'Yếu tố nguy cơ khác nhau giữa từng loại ung thư máu.',
      items: [
        'Tuổi và một số bất thường di truyền.',
        'Tiền sử hóa trị hoặc xạ trị.',
        'Phơi nhiễm bức xạ ion hóa hoặc benzen.',
        'Một số hội chứng di truyền hay tình trạng suy giảm miễn dịch.',
      ],
    },
    stages: {
      title: 'Phân loại bệnh',
      intro: 'Ung thư máu được phân loại theo dòng tế bào và tốc độ tiến triển.',
      items: [
        'Bệnh bạch cầu cấp hoặc mạn tính.',
        'U lympho Hodgkin hoặc không Hodgkin.',
        'Đa u tủy xương và các bệnh tương bào.',
        'Các bệnh tăng sinh hoặc rối loạn sinh tủy khác.',
      ],
    },
    treatment: {
      title: 'Chẩn đoán và điều trị',
      intro: 'Phác đồ được lựa chọn dựa trên thể bệnh và đặc điểm riêng của từng người.',
      items: [
        'Hóa trị hoặc thuốc nhắm trúng đích.',
        'Liệu pháp miễn dịch khi có chỉ định.',
        'Xạ trị trong một số trường hợp.',
        'Ghép tế bào gốc tạo máu hoặc theo dõi chủ động khi phù hợp.',
      ],
    },
    prevention: {
      title: 'Chủ động theo dõi sức khỏe',
      intro:
        'Không phải mọi loại ung thư máu đều có biện pháp phòng ngừa hoặc tầm soát thường quy.',
      items: [
        'Hạn chế phơi nhiễm không cần thiết với hóa chất độc hại và bức xạ.',
        'Khám khi có triệu chứng kéo dài hoặc kết quả xét nghiệm máu bất thường.',
        'Tuân thủ lịch theo dõi nếu có bệnh nền hoặc tiền sử điều trị làm tăng nguy cơ.',
      ],
    },
  },
  'ung-thu-da-day': {
    slug: 'ung-thu-da-day',
    name: 'Ung thư dạ dày',
    tagline: 'Nhận biết dấu hiệu, yếu tố nguy cơ và hướng điều trị',
    intro:
      'Ung thư dạ dày hình thành khi các tế bào trong dạ dày phát triển bất thường và mất kiểm soát. Bệnh thường ít biểu hiện rõ ở giai đoạn đầu, vì vậy những triệu chứng tiêu hóa kéo dài hoặc thay đổi bất thường cần được thăm khám đúng lúc.',
    heroImage: '/assets/images/cancer-types/stomach.png',
    heroAlt: 'Minh họa dạ dày và quá trình thăm khám hệ tiêu hóa',
    theme: 'stomach',
    layout: 'article',
    articleTitle: 'Ung thư dạ dày: Dấu hiệu, yếu tố nguy cơ, chẩn đoán và điều trị',
    publishedAt: '12 Tháng 9, 2026',
    readingTime: '7 phút đọc',
    articleSections: [
      {
        title: 'Tìm hiểu chung về ung thư dạ dày',
        paragraphs: [
          'Ung thư dạ dày bắt đầu từ các tế bào của dạ dày. Phần lớn trường hợp là ung thư biểu mô tuyến, phát triển từ lớp niêm mạc; ngoài ra còn có các dạng ít gặp hơn như u mô đệm đường tiêu hóa, u thần kinh nội tiết hoặc lymphoma tại dạ dày.',
          'Vị trí khối u và mức độ lan rộng là những yếu tố quan trọng khi lập kế hoạch điều trị. Ở giai đoạn sớm, bệnh có thể chưa tạo ra triệu chứng đặc hiệu nên việc đánh giá nguy cơ và khám khi có biểu hiện kéo dài rất quan trọng.',
        ],
        image: '/assets/images/cancer-types/stomach.png',
        imageAlt: 'Minh họa cấu trúc dạ dày và khu vực cần theo dõi',
      },
      {
        title: 'Những dấu hiệu cần lưu ý',
        paragraphs: [
          'Biểu hiện ban đầu có thể gồm khó tiêu, khó chịu hoặc đau vùng bụng trên, đầy bụng sau ăn, buồn nôn nhẹ, chán ăn hoặc ợ nóng. Những triệu chứng này cũng thường gặp ở nhiều bệnh tiêu hóa lành tính nên không thể tự dùng chúng để kết luận ung thư.',
          'Khi bệnh tiến triển, người bệnh có thể nôn, sụt cân không rõ nguyên nhân, đau bụng tăng dần, khó nuốt, đi ngoài phân đen hoặc có máu. Nếu triệu chứng kéo dài, tái diễn hoặc nặng lên, người bệnh nên tới cơ sở y tế để được đánh giá.',
        ],
      },
      {
        title: 'Nguyên nhân và yếu tố nguy cơ',
        paragraphs: [
          'Nhiễm vi khuẩn Helicobacter pylori kéo dài là một yếu tố nguy cơ quan trọng, đặc biệt với ung thư ở phần giữa và dưới dạ dày. Nguy cơ cũng có thể tăng ở người lớn tuổi, người hút thuốc, có tiền sử gia đình hoặc một số hội chứng di truyền.',
          'Chế độ ăn nhiều thực phẩm muối, hun khói hay bảo quản mặn, ít rau quả; viêm teo niêm mạc dạ dày, dị sản ruột và thiếu máu ác tính cũng có liên quan tới nguy cơ. Có yếu tố nguy cơ không đồng nghĩa chắc chắn mắc bệnh, và nhiều người bệnh không có nguyên nhân rõ ràng.',
        ],
      },
      {
        title: 'Chẩn đoán và điều trị',
        paragraphs: [
          'Bác sĩ có thể khai thác bệnh sử, khám lâm sàng và chỉ định nội soi đường tiêu hóa trên. Khi thấy vùng nghi ngờ, mẫu mô được lấy để sinh thiết. Chụp cắt lớp hoặc các xét nghiệm hình ảnh khác giúp xác định mức độ lan rộng; xét nghiệm dấu ấn sinh học trên khối u có thể hỗ trợ lựa chọn thuốc.',
          'Điều trị phụ thuộc vào giai đoạn, vị trí khối u, đặc điểm sinh học và sức khỏe tổng thể. Các phương pháp có thể gồm cắt tổn thương qua nội soi ở một số trường hợp rất sớm, phẫu thuật, hóa trị, xạ trị, thuốc nhắm trúng đích hoặc liệu pháp miễn dịch. Kế hoạch cần được cá thể hóa bởi nhóm chuyên môn.',
        ],
      },
    ],
    signs: {
      title: 'Những dấu hiệu',
      intro: 'Triệu chứng sớm thường mơ hồ và dễ nhầm với bệnh tiêu hóa thông thường.',
      items: [
        'Khó tiêu, ợ nóng hoặc khó chịu vùng bụng trên kéo dài.',
        'Đầy bụng sau ăn, buồn nôn hoặc chán ăn.',
        'Sụt cân không chủ ý, nôn hoặc đau bụng tăng dần.',
        'Khó nuốt, phân đen hoặc có dấu hiệu xuất huyết tiêu hóa.',
      ],
    },
    risks: {
      title: 'Yếu tố nguy cơ',
      intro:
        'Nhiều yếu tố có thể làm tăng nguy cơ nhưng không trực tiếp quyết định một người sẽ mắc bệnh.',
      items: [
        'Nhiễm Helicobacter pylori kéo dài.',
        'Hút thuốc và chế độ ăn nhiều thực phẩm muối hoặc bảo quản mặn.',
        'Viêm teo dạ dày, dị sản ruột hoặc thiếu máu ác tính.',
        'Tuổi cao, tiền sử gia đình hoặc một số hội chứng di truyền.',
      ],
    },
    stages: {
      title: 'Đánh giá giai đoạn',
      intro: 'Giai đoạn phản ánh độ sâu của khối u và mức độ lan tới hạch hoặc cơ quan khác.',
      items: [
        'Tổn thương rất sớm còn khu trú ở lớp niêm mạc.',
        'Khối u xâm lấn sâu hơn vào thành dạ dày.',
        'Bệnh lan tới các hạch bạch huyết lân cận.',
        'Bệnh di căn tới các cơ quan xa.',
      ],
    },
    treatment: {
      title: 'Chẩn đoán và điều trị',
      intro: 'Phác đồ được lựa chọn theo giai đoạn, đặc điểm khối u và thể trạng người bệnh.',
      items: [
        'Nội soi cắt tổn thương ở một số trường hợp rất sớm.',
        'Phẫu thuật cắt một phần hoặc toàn bộ dạ dày khi phù hợp.',
        'Hóa trị và xạ trị trước hoặc sau phẫu thuật tùy chỉ định.',
        'Thuốc nhắm trúng đích hoặc miễn dịch dựa trên dấu ấn sinh học.',
      ],
    },
    prevention: {
      title: 'Giảm nguy cơ và theo dõi',
      intro:
        'Điều chỉnh các yếu tố có thể thay đổi và quản lý bệnh dạ dày giúp chủ động bảo vệ sức khỏe.',
      items: [
        'Không hút thuốc; duy trì chế độ ăn đa dạng, tăng rau quả và hạn chế thực phẩm quá mặn.',
        'Khám và điều trị H. pylori theo hướng dẫn của bác sĩ.',
        'Theo dõi chuyên khoa nếu có tổn thương tiền ung thư hoặc nguy cơ di truyền.',
      ],
    },
  },
  'ung-thu-tuyen-tien-liet': {
    slug: 'ung-thu-tuyen-tien-liet',
    name: 'Ung thư tuyến tiền liệt',
    tagline: 'Hiểu dấu hiệu, đánh giá nguy cơ và lựa chọn điều trị',
    intro:
      'Ung thư tuyến tiền liệt hình thành trong tuyến tiền liệt, một tuyến nhỏ thuộc hệ sinh dục nam nằm dưới bàng quang. Nhiều khối u phát triển chậm, nhưng một số có thể tiến triển nhanh và lan sang cơ quan khác, vì vậy kế hoạch theo dõi hoặc điều trị cần dựa trên đánh giá riêng của từng người.',
    heroImage: '/assets/images/cancer-types/prostate.png',
    heroAlt: 'Minh họa tuyến tiền liệt và quá trình thăm khám hệ tiết niệu sinh dục nam',
    theme: 'prostate',
    layout: 'article',
    articleTitle: 'Ung thư tuyến tiền liệt: Dấu hiệu, chẩn đoán và phương pháp điều trị',
    publishedAt: '12 Tháng 9, 2026',
    readingTime: '7 phút đọc',
    articleSections: [
      {
        title: 'Tìm hiểu chung về ung thư tuyến tiền liệt',
        paragraphs: [
          'Tuyến tiền liệt nằm ngay dưới bàng quang, phía trước trực tràng và bao quanh một phần niệu đạo. Tuyến này tạo ra một phần dịch trong tinh dịch. Ung thư xuất hiện khi các tế bào tại tuyến phát triển bất thường và mất kiểm soát; phần lớn trường hợp là ung thư biểu mô tuyến.',
          'Bệnh thường gặp hơn ở nam giới lớn tuổi. Nhiều trường hợp tiến triển chậm và có thể được theo dõi trong thời gian dài, trong khi những khối u nguy cơ cao cần điều trị sớm. Mức PSA, độ mô học và giai đoạn bệnh giúp bác sĩ đánh giá mức độ nguy cơ.',
        ],
        image: '/assets/images/cancer-types/prostate.png',
        imageAlt: 'Minh họa vị trí tuyến tiền liệt trong hệ tiết niệu sinh dục nam',
      },
      {
        title: 'Những dấu hiệu cần lưu ý',
        paragraphs: [
          'Ung thư tuyến tiền liệt giai đoạn sớm thường không gây triệu chứng. Khi có biểu hiện, người bệnh có thể gặp khó khăn lúc bắt đầu tiểu, tia tiểu yếu hoặc ngắt quãng, đi tiểu nhiều lần — đặc biệt về đêm — hoặc cảm giác bàng quang chưa hết nước tiểu.',
          'Ở giai đoạn tiến triển, bệnh có thể gây tiểu ra máu, có máu trong tinh dịch hoặc đau kéo dài ở lưng, hông hay vùng chậu. Phì đại tuyến tiền liệt lành tính và các bệnh lý khác cũng có thể gây triệu chứng tương tự, vì vậy cần khám để xác định nguyên nhân thay vì tự chẩn đoán.',
        ],
      },
      {
        title: 'Yếu tố nguy cơ và việc sàng lọc',
        paragraphs: [
          'Nguy cơ tăng theo tuổi. Tiền sử gia đình, một số biến thể di truyền và nguồn gốc tổ tiên cũng có thể ảnh hưởng tới nguy cơ. Tuy nhiên, một người có yếu tố nguy cơ không nhất thiết sẽ mắc bệnh và nhiều trường hợp không có nguyên nhân xác định rõ.',
          'Xét nghiệm PSA có thể hỗ trợ phát hiện bất thường nhưng không tự khẳng định ung thư; PSA cũng có thể tăng do phì đại lành tính hoặc viêm tuyến tiền liệt. Sàng lọc có cả lợi ích lẫn nguy cơ chẩn đoán và điều trị quá mức, nên quyết định cần được trao đổi với bác sĩ dựa trên tuổi, nguy cơ cá nhân và ưu tiên của người bệnh.',
        ],
      },
      {
        title: 'Chẩn đoán và điều trị',
        paragraphs: [
          'Quá trình đánh giá có thể gồm hỏi bệnh, khám trực tràng bằng ngón tay, xét nghiệm PSA và chụp cộng hưởng từ. Sinh thiết tuyến tiền liệt được thực hiện để xác nhận ung thư và đánh giá độ mô học; các xét nghiệm hình ảnh khác có thể được chỉ định để xác định mức độ lan rộng.',
          'Lựa chọn điều trị phụ thuộc vào nhóm nguy cơ, giai đoạn, tuổi, sức khỏe và mong muốn của người bệnh. Các phương pháp gồm theo dõi chủ động, phẫu thuật, xạ trị, liệu pháp hormone, hóa trị, thuốc nhắm trúng đích hoặc miễn dịch trong những trường hợp phù hợp. Mỗi lựa chọn có lợi ích và tác dụng không mong muốn cần được thảo luận kỹ.',
        ],
      },
    ],
    signs: {
      title: 'Những dấu hiệu',
      intro: 'Bệnh giai đoạn sớm thường không có triệu chứng rõ ràng.',
      items: [
        'Khó bắt đầu tiểu hoặc tia tiểu yếu, ngắt quãng.',
        'Đi tiểu thường xuyên, đặc biệt vào ban đêm.',
        'Cảm giác bàng quang chưa hết nước tiểu.',
        'Tiểu ra máu hoặc đau kéo dài ở lưng, hông hay vùng chậu.',
      ],
    },
    risks: {
      title: 'Yếu tố nguy cơ',
      intro: 'Nguy cơ khác nhau giữa từng người và tăng rõ theo tuổi.',
      items: [
        'Tuổi cao, đặc biệt sau tuổi trung niên.',
        'Cha hoặc anh em ruột từng mắc ung thư tuyến tiền liệt.',
        'Một số biến thể hoặc hội chứng di truyền.',
        'Nguồn gốc tổ tiên có liên quan tới nguy cơ cao hơn.',
      ],
    },
    stages: {
      title: 'Đánh giá mức độ bệnh',
      intro: 'Bác sĩ kết hợp giai đoạn, PSA và độ mô học để phân nhóm nguy cơ.',
      items: [
        'Khối u còn khu trú trong tuyến tiền liệt.',
        'Khối u lan ra mô lân cận hoặc túi tinh.',
        'Bệnh lan tới hạch bạch huyết vùng chậu.',
        'Bệnh di căn tới xương hoặc cơ quan xa.',
      ],
    },
    treatment: {
      title: 'Chẩn đoán và điều trị',
      intro: 'Điều trị được cá thể hóa theo nguy cơ bệnh và ưu tiên của người bệnh.',
      items: [
        'Theo dõi chủ động đối với một số ung thư nguy cơ thấp.',
        'Phẫu thuật hoặc xạ trị cho bệnh còn khu trú khi phù hợp.',
        'Liệu pháp hormone để làm giảm tác động của androgen.',
        'Hóa trị, thuốc nhắm trúng đích hoặc miễn dịch trong một số trường hợp tiến triển.',
      ],
    },
    prevention: {
      title: 'Chủ động theo dõi sức khỏe',
      intro: 'Hiện không có biện pháp bảo đảm ngăn ngừa hoàn toàn ung thư tuyến tiền liệt.',
      items: [
        'Trao đổi với bác sĩ về lợi ích và nguy cơ của xét nghiệm PSA.',
        'Thông báo tiền sử ung thư trong gia đình để được đánh giá nguy cơ phù hợp.',
        'Khám khi có triệu chứng tiết niệu kéo dài hoặc đau xương không rõ nguyên nhân.',
      ],
    },
  },
  'ung-thu-vom-hong': {
    slug: 'ung-thu-vom-hong',
    name: 'Ung thư vòm họng',
    tagline: 'Nhận biết sớm những thay đổi ở tai, mũi, họng và vùng cổ',
    intro:
      'Ung thư vòm họng là ung thư đầu và cổ bắt đầu tại vòm mũi họng — phần trên của họng nằm phía sau mũi. Vị trí này khó quan sát trực tiếp và các triệu chứng ban đầu dễ giống bệnh tai mũi họng thông thường, vì vậy những biểu hiện kéo dài hoặc xuất hiện một bên cần được thăm khám.',
    heroImage: '/assets/images/cancer-types/nasopharyngeal.png',
    heroAlt: 'Minh họa vòm mũi họng và quá trình thăm khám tai mũi họng',
    theme: 'nasopharyngeal',
    layout: 'article',
    articleTitle: 'Ung thư vòm họng: Dấu hiệu, yếu tố nguy cơ và phương pháp điều trị',
    publishedAt: '12 Tháng 9, 2026',
    readingTime: '7 phút đọc',
    articleSections: [
      {
        title: 'Tìm hiểu chung về ung thư vòm họng',
        paragraphs: [
          'Vòm mũi họng là phần cao nhất của họng, nằm sau khoang mũi. Ung thư tại đây khác với ung thư hầu miệng hoặc hạ họng về yếu tố nguy cơ và cách điều trị. Dạng thường gặp bắt nguồn từ các tế bào biểu mô phủ bề mặt vòm họng.',
          'Bệnh có thể lan tới các hạch bạch huyết ở cổ từ sớm. Tiên lượng và lựa chọn điều trị phụ thuộc vào kích thước khối u, mức độ lan tới hạch hoặc cơ quan xa, sức khỏe tổng thể và đáp ứng của từng người.',
        ],
        image: '/assets/images/cancer-types/nasopharyngeal.png',
        imageAlt: 'Minh họa vị trí vòm họng phía sau khoang mũi',
      },
      {
        title: 'Những dấu hiệu cần lưu ý',
        paragraphs: [
          'Dấu hiệu ban đầu có thể là một khối hoặc hạch ở cổ, nghẹt mũi kéo dài, chảy máu mũi, đau họng, ù tai, đau tai hoặc giảm thính lực — đặc biệt khi biểu hiện chỉ ở một bên. Người bệnh cũng có thể gặp khó thở qua mũi hoặc thay đổi giọng nói.',
          'Khi bệnh tiến triển, có thể xuất hiện đau đầu, nhìn đôi, tê hoặc yếu vùng mặt. Những triệu chứng này cũng gặp trong nhiều bệnh lý khác; tuy nhiên, nếu kéo dài, tái diễn hoặc tăng dần thì cần khám chuyên khoa tai mũi họng để xác định nguyên nhân.',
        ],
      },
      {
        title: 'Nguyên nhân và yếu tố nguy cơ',
        paragraphs: [
          'Nhiễm virus Epstein–Barr có liên quan chặt chẽ với nhiều trường hợp ung thư vòm họng, nhưng phần lớn người từng nhiễm virus không phát triển thành ung thư. Nguy cơ còn chịu ảnh hưởng bởi tiền sử gia đình, nguồn gốc tổ tiên và khu vực sinh sống.',
          'Hút thuốc, tiếp xúc với khói thuốc, sử dụng rượu nhiều và thường xuyên ăn cá hoặc thịt ướp muối cũng có thể làm tăng nguy cơ. Có một hoặc nhiều yếu tố nguy cơ không có nghĩa chắc chắn sẽ mắc bệnh.',
        ],
      },
      {
        title: 'Chẩn đoán và điều trị',
        paragraphs: [
          'Bác sĩ thường khám vùng đầu cổ, đánh giá hạch và nội soi mũi họng bằng ống mềm. Mẫu mô được lấy để sinh thiết xác nhận ung thư. Chụp cộng hưởng từ, cắt lớp vi tính, PET/CT hoặc các xét nghiệm liên quan tới EBV có thể hỗ trợ xác định giai đoạn và lập kế hoạch điều trị.',
          'Xạ trị là phương pháp điều trị quan trọng vì vòm họng nằm sâu và nhạy với tia xạ. Hóa trị có thể được kết hợp với xạ trị ở bệnh tiến triển tại chỗ hoặc vùng; hóa trị, miễn dịch và các phương pháp toàn thân khác có thể được cân nhắc khi bệnh tái phát hoặc di căn. Phẫu thuật chỉ phù hợp trong một số tình huống được lựa chọn.',
        ],
      },
    ],
    signs: {
      title: 'Những dấu hiệu',
      intro: 'Biểu hiện có thể xuất hiện ở tai, mũi, họng hoặc hạch vùng cổ.',
      items: [
        'Hạch hoặc khối ở cổ, thường không đau.',
        'Nghẹt mũi kéo dài hoặc chảy máu mũi.',
        'Ù tai, đau tai hoặc giảm thính lực một bên.',
        'Đau đầu, nhìn đôi, tê hoặc yếu vùng mặt khi bệnh tiến triển.',
      ],
    },
    risks: {
      title: 'Yếu tố nguy cơ',
      intro: 'Nguy cơ là kết quả của nhiều yếu tố môi trường, di truyền và nhiễm virus.',
      items: [
        'Nhiễm virus Epstein–Barr.',
        'Tiền sử gia đình hoặc nguồn gốc từ khu vực có tỷ lệ bệnh cao.',
        'Hút thuốc hoặc thường xuyên hít khói thuốc thụ động.',
        'Uống nhiều rượu hoặc ăn thường xuyên thực phẩm ướp muối.',
      ],
    },
    stages: {
      title: 'Đánh giá giai đoạn',
      intro: 'Giai đoạn phản ánh mức độ lan của khối u tại vòm họng, hạch cổ và cơ quan xa.',
      items: [
        'Khối u còn giới hạn tại vòm họng hoặc vùng lân cận.',
        'Khối u xâm lấn sâu hơn vào các cấu trúc đầu và cổ.',
        'Bệnh lan tới một hoặc nhiều nhóm hạch vùng cổ.',
        'Bệnh di căn tới phổi, xương, gan hoặc cơ quan khác.',
      ],
    },
    treatment: {
      title: 'Chẩn đoán và điều trị',
      intro: 'Phác đồ được lựa chọn theo giai đoạn và đặc điểm riêng của người bệnh.',
      items: [
        'Xạ trị cho khối u tại vòm họng và vùng hạch nguy cơ.',
        'Hóa xạ trị đồng thời trong nhiều trường hợp tiến triển tại chỗ hoặc vùng.',
        'Hóa trị hoặc miễn dịch khi bệnh tái phát hay di căn và có chỉ định.',
        'Phẫu thuật trong một số trường hợp tồn lưu hoặc tái phát được lựa chọn.',
      ],
    },
    prevention: {
      title: 'Giảm nguy cơ và chủ động thăm khám',
      intro:
        'Không có biện pháp bảo đảm phòng ngừa hoàn toàn, nhưng có thể giảm các yếu tố nguy cơ thay đổi được.',
      items: [
        'Không hút thuốc và tránh hít khói thuốc thụ động.',
        'Hạn chế rượu và thực phẩm ướp muối hoặc bảo quản mặn.',
        'Khám sớm khi có hạch cổ hoặc triệu chứng tai mũi họng một bên kéo dài.',
      ],
    },
  },
};
