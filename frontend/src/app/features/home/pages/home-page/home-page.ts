import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface ExploreItem {
  title: string;
  description: string;
  route: string;
  icon: string;
}

interface GuideArticle {
  category: string;
  title: string;
  summary: string;
  image: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home-page.html',
})
export class HomePage {
  protected readonly exploreItems: ExploreItem[] = [
    {
      title: 'Góc tâm lý và tinh thần',
      description: 'Chăm sóc cảm xúc cho người bệnh và người đồng hành.',
      route: '/goc-tam-ly',
      icon: '03',
    },
    {
      title: 'Cộng đồng',
      description: 'Kết nối, sẻ chia trải nghiệm và cùng nhau lan tỏa hy vọng.',
      route: '/cong-dong',
      icon: '04',
    },
    {
      title: 'Các loại ung thư',
      description: 'Tra cứu thông tin nền tảng, dấu hiệu và hướng chăm sóc theo từng nhóm bệnh.',
      route: '/loai-ung-thu',
      icon: '05',
    },
  ];

  protected readonly guideArticles: GuideArticle[] = [
    {
      category: 'Điều trị',
      title: 'Những điều cần biết trước buổi hóa trị đầu tiên',
      summary: 'Chuẩn bị tốt giúp bạn cảm thấy an tâm và chủ động hơn trong quá trình điều trị.',
      image: '/assets/images/home/guide-chemotherapy.png',
    },
    {
      category: 'Dinh dưỡng',
      title: 'Dinh dưỡng phù hợp trong thời gian điều trị',
      summary: 'Những nguyên tắc đơn giản để xây dựng bữa ăn đủ chất và phù hợp thể trạng.',
      image: '/assets/images/home/guide-nutrition.png',
    },
    {
      category: 'Tinh thần',
      title: 'Chăm sóc sức khỏe tinh thần mỗi ngày',
      summary: 'Nhận diện cảm xúc và tìm sự hỗ trợ khi hành trình trở nên quá sức.',
      image: '/assets/images/home/guide-mental-health.png',
    },
    {
      category: 'Người đồng hành',
      title: 'Cách ở bên người thân một cách dịu dàng',
      summary: 'Lắng nghe, sẻ chia và tôn trọng nhu cầu của người bệnh trong từng giai đoạn.',
      image: '/assets/images/home/guide-family.png',
    },
  ];

  protected readonly faqItems: FaqItem[] = [
    {
      question: 'Trạm K cung cấp những nội dung gì?',
      answer:
        'Trạm K tổng hợp cẩm nang, câu chuyện cộng đồng, thông tin các loại ung thư và những chương trình hỗ trợ đã được quản trị viên kiểm duyệt.',
    },
    {
      question: 'Tôi có thể chia sẻ câu chuyện của mình không?',
      answer:
        'Có. Sau khi đăng nhập, thành viên có thể gửi bài chia sẻ. Bài viết sẽ ở trạng thái chờ duyệt trước khi xuất hiện công khai.',
    },
    {
      question: 'Làm thế nào để tham gia cộng đồng?',
      answer:
        'Bạn đăng ký tài khoản thành viên, hoàn thiện hồ sơ rồi có thể tham gia bình luận và gửi câu chuyện của mình.',
    },
    {
      question: 'Nhà hảo tâm đăng ký chương trình hỗ trợ ở đâu?',
      answer:
        'Đối tác đăng ký tài khoản và gửi thông tin chương trình hoặc điểm phát cơm. Quản trị viên sẽ xác minh trước khi công bố.',
    },
    {
      question: 'Thông tin trên website có thay thế tư vấn y khoa không?',
      answer:
        'Không. Nội dung chỉ có mục đích tham khảo và đồng hành. Bạn nên trao đổi trực tiếp với bác sĩ cho mọi quyết định liên quan đến chẩn đoán và điều trị.',
    },
  ];

  protected readonly partners = ['BV 01', 'Quỹ K', 'HT 03', 'TN 04', 'BV 05', 'TC 06', 'HT 07'];
  protected readonly openFaqIndex = signal(0);

  protected toggleFaq(index: number): void {
    this.openFaqIndex.update((current) => (current === index ? -1 : index));
  }
}
