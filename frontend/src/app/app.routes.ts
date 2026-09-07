import { Routes } from '@angular/router';

import { guestGuard, roleGuard } from '@core/auth/auth.guard';

const loadSectionPlaceholder = () =>
  import('@features/shell/pages/section-placeholder-page/section-placeholder-page').then(
    (component) => component.SectionPlaceholderPage,
  );

const publicSectionRoutes: Routes = [
  {
    path: 'dang-nhap',
    title: 'Đăng nhập | Trạm K',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('@features/auth/pages/login-page/login-page').then((component) => component.LoginPage),
  },
  {
    path: 'dang-ky',
    title: 'Đăng ký | Trạm K',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('@features/auth/pages/register-page/register-page').then(
        (component) => component.RegisterPage,
      ),
  },
  {
    path: 'quen-mat-khau',
    title: 'Quên mật khẩu | Trạm K',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('@features/auth/pages/forgot-password-page/forgot-password-page').then(
        (component) => component.ForgotPasswordPage,
      ),
  },
  {
    path: 'dat-lai-mat-khau',
    title: 'Đặt lại mật khẩu | Trạm K',
    loadComponent: () =>
      import('@features/auth/pages/reset-password-page/reset-password-page').then(
        (component) => component.ResetPasswordPage,
      ),
  },
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
    loadComponent: () =>
      import('@features/profile/pages/profile-page/profile-page').then(
        (component) => component.ProfilePage,
      ),
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

const adminSectionRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'nguoi-dung',
  },
  {
    path: 'nguoi-dung',
    title: 'Quản lý người dùng | Trạm K',
    loadComponent: () =>
      import('@features/admin/pages/admin-users-page/admin-users-page').then(
        (component) => component.AdminUsersPage,
      ),
  },
  {
    path: 'kiem-duyet',
    title: 'Kiểm duyệt cộng đồng | Trạm K',
    data: {
      area: 'admin',
      heading: 'Kiểm duyệt cộng đồng',
      description: 'Khung quản lý bài viết và bình luận đang chờ Admin duyệt.',
    },
    loadComponent: loadSectionPlaceholder,
  },
  {
    path: 'noi-dung',
    title: 'Quản lý nội dung | Trạm K',
    data: {
      area: 'admin',
      heading: 'Quản lý nội dung',
      description: 'Khung quản lý cẩm nang, loại ung thư và câu chuyện truyền cảm hứng.',
    },
    loadComponent: loadSectionPlaceholder,
  },
  {
    path: 'chuong-trinh',
    title: 'Chương trình hỗ trợ | Trạm K',
    data: {
      area: 'admin',
      heading: 'Chương trình hỗ trợ',
      description: 'Khung duyệt và quản lý các chương trình do nhà hảo tâm đăng ký.',
    },
    loadComponent: loadSectionPlaceholder,
  },
  {
    path: 'diem-phat-com',
    title: 'Điểm phát cơm | Trạm K',
    data: {
      area: 'admin',
      heading: 'Điểm phát cơm',
      description: 'Khung duyệt địa điểm, lịch phát và thông tin liên hệ của điểm hỗ trợ.',
    },
    loadComponent: loadSectionPlaceholder,
  },
];

export const routes: Routes = [
  {
    path: 'admin',
    canActivate: [roleGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () =>
      import('@layouts/admin-layout/admin-layout').then((component) => component.AdminLayout),
    children: adminSectionRoutes,
  },
  {
    path: 'doi-tac',
    title: 'Khu vực đối tác | Trạm K',
    canActivate: [roleGuard],
    data: {
      roles: ['PARTNER'],
      area: 'partner',
      heading: 'Khu vực đối tác',
      description:
        'Tài khoản của bạn đã vào đúng khu vực. Chức năng đăng ký và đề xuất chương trình sẽ được hoàn thiện ở Phase 6.',
    },
    loadComponent: loadSectionPlaceholder,
  },
  {
    path: 'thanh-vien',
    canActivate: [roleGuard],
    data: { roles: ['PATIENT', 'CARER'] },
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
