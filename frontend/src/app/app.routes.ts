import { Routes } from '@angular/router';

const loadSectionPlaceholder = () =>
  import('@features/shell/pages/section-placeholder-page/section-placeholder-page').then(
    (component) => component.SectionPlaceholderPage,
  );

const publicSectionRoutes: Routes = [
  {
    path: 'cam-nang',
    title: 'Cẩm nang | Trạm K',
    data: {
      heading: 'Cẩm nang đồng hành',
      description: 'Kiến thức chăm sóc và hướng dẫn thiết thực dành cho bệnh nhân và gia đình.',
    },
    loadComponent: loadSectionPlaceholder,
  },
  {
    path: 'loai-ung-thu',
    title: 'Các loại ung thư | Trạm K',
    data: {
      heading: 'Thông tin các loại ung thư',
      description: 'Không gian tra cứu kiến thức cơ bản theo từng nhóm bệnh ung thư.',
    },
    loadComponent: loadSectionPlaceholder,
  },
  {
    path: 'cau-chuyen',
    title: 'Câu chuyện truyền cảm hứng | Trạm K',
    data: {
      heading: 'Câu chuyện truyền cảm hứng',
      description: 'Nơi lưu giữ những hành trình, trải nghiệm và nguồn động lực từ cộng đồng.',
    },
    loadComponent: loadSectionPlaceholder,
  },
  {
    path: 'cong-dong',
    title: 'Cộng đồng | Trạm K',
    data: {
      heading: 'Cộng đồng Trạm K',
      description: 'Không gian để thành viên chia sẻ trải nghiệm và đồng hành cùng nhau.',
    },
    loadComponent: loadSectionPlaceholder,
  },
  {
    path: 'goc-tam-ly',
    title: 'Góc tâm lý và tinh thần | Trạm K',
    data: {
      heading: 'Góc tâm lý và tinh thần',
      description: 'Nội dung giúp người bệnh và người thân chăm sóc sức khỏe tinh thần.',
    },
    loadComponent: loadSectionPlaceholder,
  },
  {
    path: 've-chung-toi',
    title: 'Về chúng tôi | Trạm K',
    data: {
      heading: 'Về Trạm K',
      description: 'Giới thiệu mục tiêu, giá trị và đội ngũ phát triển dự án Trạm K.',
    },
    loadComponent: loadSectionPlaceholder,
  },
  {
    path: 'tim-kiem',
    title: 'Tìm kiếm | Trạm K',
    data: {
      heading: 'Tìm kiếm thông tin',
      description: 'Khung tìm kiếm bài viết, cẩm nang, câu chuyện và chương trình hỗ trợ.',
    },
    loadComponent: loadSectionPlaceholder,
  },
];

const memberSectionRoutes: Routes = [
  {
    path: '',
    title: 'Tổng quan thành viên | Trạm K',
    data: {
      area: 'member',
      heading: 'Tổng quan thành viên',
      description: 'Theo dõi hồ sơ, bài viết, bình luận và các đăng ký hỗ trợ của bạn.',
    },
    loadComponent: loadSectionPlaceholder,
  },
  {
    path: 'ho-so',
    title: 'Hồ sơ của tôi | Trạm K',
    data: {
      area: 'member',
      heading: 'Hồ sơ của tôi',
      description: 'Khung quản lý thông tin cá nhân và các thiết lập riêng tư.',
    },
    loadComponent: loadSectionPlaceholder,
  },
  {
    path: 'bai-viet',
    title: 'Bài viết của tôi | Trạm K',
    data: {
      area: 'member',
      heading: 'Bài viết của tôi',
      description: 'Khung tạo bài chia sẻ và theo dõi trạng thái chờ quản trị viên duyệt.',
    },
    loadComponent: loadSectionPlaceholder,
  },
  {
    path: 'binh-luan',
    title: 'Bình luận của tôi | Trạm K',
    data: {
      area: 'member',
      heading: 'Bình luận của tôi',
      description: 'Khung quản lý những bình luận thành viên đã gửi trong cộng đồng.',
    },
    loadComponent: loadSectionPlaceholder,
  },
  {
    path: 'dang-ky-ho-tro',
    title: 'Đăng ký hỗ trợ | Trạm K',
    data: {
      area: 'member',
      heading: 'Đăng ký hỗ trợ',
      description: 'Khung theo dõi các chương trình hỗ trợ và điểm phát cơm đã đăng ký.',
    },
    loadComponent: loadSectionPlaceholder,
  },
];

export const routes: Routes = [
  {
    path: 'thanh-vien',
    loadComponent: () =>
      import('@layouts/member-layout/member-layout').then((component) => component.MemberLayout),
    children: memberSectionRoutes,
  },
  {
    path: '',
    loadComponent: () =>
      import('@layouts/public-layout/public-layout').then((component) => component.PublicLayout),
    children: [
      {
        path: '',
        title: 'Trang chủ | Tram-K',
        loadComponent: () =>
          import('@features/home/pages/home-page/home-page').then(
            (component) => component.HomePage,
          ),
      },
      {
        path: 'style-guide',
        title: 'Style Guide | Trạm K',
        loadComponent: () =>
          import('@features/style-guide/pages/style-guide-page/style-guide-page').then(
            (component) => component.StyleGuidePage,
          ),
      },
      ...publicSectionRoutes,
      {
        path: '**',
        redirectTo: '',
      },
    ],
  },
];
