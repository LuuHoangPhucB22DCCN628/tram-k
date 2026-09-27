import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SOCIAL_LINKS } from '../../../../core/config/social-links';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home-page.html',
  // Một component; chia SCSS theo vùng và responsive để dễ theo dõi.
  styleUrls: ['./home-page.scss', './home-page-sections.scss', './home-page-responsive.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  protected readonly socialLinks = SOCIAL_LINKS;
  protected readonly openFaqIndex = signal(0);
  protected readonly chatNoticeOpen = signal(false);
  protected readonly guideArticles = [
    {
      category: 'Điều trị',
      title: 'Những điều cần biết trước buổi hóa trị đầu tiên',
      summary: 'Chuẩn bị tốt giúp bạn cảm thấy an tâm và chủ động hơn trong quá trình điều trị.',
      image: 'guide-chemotherapy.png',
      route: '/cam-nang',
    },
    {
      category: 'Dinh dưỡng',
      title: '5 thực phẩm hỗ trợ duy trì năng lượng mỗi ngày',
      summary: 'Gợi ý đơn giản giúp cơ thể nhận đủ dưỡng chất trong quá trình điều trị.',
      image: 'guide-nutrition.png',
      route: '/cam-nang',
    },
    {
      category: 'Điều trị',
      title: 'Những câu chuyện truyền cảm hứng từ người bệnh',
      summary: 'Lắng nghe hành trình vượt qua thử thách của những bệnh nhân.',
      image: 'guide-mental-health.png',
      route: '/cau-chuyen',
    },
    {
      category: 'Chăm sóc',
      title: 'Chăm sóc bản thân từ những điều nhỏ nhất',
      summary: 'Dinh dưỡng, nghỉ ngơi và vận động đều là những bước tiến đáng quý.',
      image: 'guide-family.png',
      route: '/cam-nang',
    },
  ];
  protected readonly faqItems = [
    {
      question: 'Tôi vừa được chẩn đoán ung thư, tôi nên làm như thế nào?',
      answer:
        'Hãy cho bản thân thời gian để tiếp nhận thông tin. Trao đổi với bác sĩ để hiểu rõ tình trạng bệnh và kế hoạch điều trị.\n\nBạn không cần phải đối mặt với hành trình này một mình. Hãy tìm kiếm sự đồng hành từ gia đình, bạn bè, đội ngũ y tế hoặc cộng đồng những người đã và đang trải qua hoàn cảnh tương tự.',
    },
    {
      question: 'Tôi có thể tìm thông tin đáng tin cậy ở đâu?',
      answer:
        'Bạn có thể tham khảo thông tin từ cơ sở y tế, trao đổi trực tiếp với bác sĩ và đọc các cẩm nang có ghi nguồn. Nội dung trên Trạm K chỉ mang tính tham khảo, không thay thế tư vấn y khoa.',
    },
    {
      question: 'Tôi cần hỗ trợ tâm lý, có ai có thể giúp tôi không?',
      answer:
        'Bạn có thể chia sẻ với người thân, đội ngũ chăm sóc hoặc chuyên gia tâm lý. Góc tâm lý và tinh thần của Trạm là nơi bắt đầu tìm hiểu các nguồn hỗ trợ.',
    },
    {
      question: 'Những loại điều trị nào có sẵn cho bệnh ung thư?',
      answer:
        'Các phương án phụ thuộc vào loại bệnh và tình trạng của từng người. Hãy hỏi bác sĩ điều trị về những lựa chọn phù hợp, lợi ích và tác dụng không mong muốn.',
    },
    {
      question: 'Tôi có thể tham gia vào các nhóm hỗ trợ không?',
      answer:
        'Có. Bạn có thể đăng ký tài khoản để tham gia cộng đồng Trạm K, bình luận và gửi câu chuyện. Bài chia sẻ cần được quản trị viên duyệt trước khi công khai.',
    },
    {
      question: 'Làm thế nào để tôi có thể chăm sóc sức khỏe tinh thần của mình tốt hơn?',
      answer:
        'Hãy dành thời gian cho những hoạt động bạn thấy dễ chịu, giữ kết nối với người tin cậy và tìm sự hỗ trợ chuyên môn khi cần. Bạn có thể xem thêm ở Góc tâm lý và tinh thần.',
    },
  ];
  // Logo từ bản thiết kế; dữ liệu đối tác thực tế sẽ được quản trị viên quản lý.
  protected readonly partners = ['', '1', '2', '3', '4', '5', '6'];
  protected toggleFaq(index: number): void {
    this.openFaqIndex.update((current) => (current === index ? -1 : index));
  }
}
