import { Routes } from '@angular/router';

import { authGuard, guestGuard, roleGuard } from '@core/auth/auth.guard';

const loadSectionPlaceholder = () =>
  import('@features/shell/pages/section-placeholder-page/section-placeholder-page').then(
    (component) => component.SectionPlaceholderPage,
  );

const loadHairRegistrationLookup = () =>
  import('@features/account/pages/hair-registration-lookup-page/hair-registration-lookup-page').then(
    (component) => component.HairRegistrationLookupPage,
  );

const publicSectionRoutes: Routes = [
  {
    path: 'tra-cuu-ma',
    title: 'Tra cứu mã đăng ký | Trạm K',
    canActivate: [authGuard],
    loadComponent: loadHairRegistrationLookup,
  },
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
    path: 'xac-minh-email',
    title: 'Xác minh email | Trạm K',
    loadComponent: () =>
      import('@features/auth/pages/verify-email-page/verify-email-page').then(
        (component) => component.VerifyEmailPage,
      ),
  },
  {
    path: 'xac-minh-email-moi',
    title: 'Xác minh email mới | Trạm K',
    loadComponent: () =>
      import('@features/auth/pages/verify-email-change-page/verify-email-change-page').then(
        (component) => component.VerifyEmailChangePage,
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
      kind: 'GUIDE',
      title: 'Cẩm nang đồng hành',
      subtitle: 'dành cho bệnh nhân và người thân',
      description:
        'Từ dinh dưỡng, điều trị đến chăm sóc tinh thần, chúng tôi mong muốn mang đến những thông tin dễ hiểu và hữu ích để người bệnh cùng gia đình cảm thấy an tâm hơn trong từng bước đi.',
      basePath: '/cam-nang',
    },
    loadComponent: () =>
      import('@features/content/pages/content-list-page/content-list-page').then(
        (component) => component.ContentListPage,
      ),
  },
  {
    path: 'cam-nang/:slug',
    loadComponent: () =>
      import('@features/content/pages/content-detail-page/content-detail-page').then(
        (component) => component.ContentDetailPage,
      ),
  },
  {
    path: 'loai-ung-thu',
    title: 'Các loại ung thư | Trạm K',
    loadComponent: () =>
      import('@features/cancer-types/pages/cancer-types-page/cancer-types-page').then(
        (component) => component.CancerTypesPage,
      ),
  },
  {
    path: 'loai-ung-thu/bai-viet/:slug',
    data: {
      kind: 'CANCER_TYPE',
      articleBasePath: '/loai-ung-thu/bai-viet',
      backPath: '/loai-ung-thu',
      backLabel: 'Loại ung thư',
    },
    loadComponent: () =>
      import('@features/content/pages/content-detail-page/content-detail-page').then(
        (component) => component.ContentDetailPage,
      ),
  },
  {
    path: 'loai-ung-thu/:slug',
    loadComponent: () =>
      import('@features/cancer-types/pages/cancer-type-detail-page/cancer-type-detail-page').then(
        (component) => component.CancerTypeDetailPage,
      ),
  },
  {
    path: 'cau-chuyen/bep-an-yen',
    title: 'Bếp An Yên - Cho đi là còn mãi | Trạm K',
    loadComponent: () =>
      import('@features/stories/pages/kitchen-story-page/kitchen-story-page').then(
        (component) => component.KitchenStoryPage,
      ),
  },
  {
    path: 'cau-chuyen/la-bai-dinh-menh',
    title: 'Lá bài định mệnh | Trạm K',
    loadComponent: () =>
      import('@features/stories/pages/destiny-story-page/destiny-story-page').then(
        (component) => component.DestinyStoryPage,
      ),
  },
  {
    path: 'cau-chuyen/bong-toi',
    title: 'Bóng tối - Khi cái chết lần đầu gõ cửa | Trạm K',
    loadComponent: () =>
      import('@features/stories/pages/dark-story-page/dark-story-page').then(
        (component) => component.DarkStoryPage,
      ),
  },
  {
    path: 'cau-chuyen/bai-viet/:slug',
    data: {
      kind: 'STORY',
      articleBasePath: '/cau-chuyen/bai-viet',
      backPath: '/cau-chuyen',
      backLabel: 'Câu chuyện',
    },
    loadComponent: () =>
      import('@features/content/pages/content-detail-page/content-detail-page').then(
        (component) => component.ContentDetailPage,
      ),
  },
  {
    path: 'cau-chuyen/anh-sang',
    title: 'Ánh sáng - Học cách sống sau lời tuyên án | Trạm K',
    loadComponent: () =>
      import('@features/stories/pages/light-story-page/light-story-page').then(
        (component) => component.LightStoryPage,
      ),
  },
  {
    path: 'cau-chuyen',
    title: 'Câu chuyện truyền cảm hứng | Trạm K',
    loadComponent: () =>
      import('@features/stories/pages/stories-page/stories-page').then(
        (component) => component.StoriesPage,
      ),
  },
  {
    path: 'cong-dong/thu-vien-toc/nhan-toc',
    title: 'Đăng ký nhận tóc | Trạm K',
    canActivate: [authGuard],
    data: { mode: 'receive' },
    loadComponent: () =>
      import('@features/community/pages/hair-registration-page/hair-registration-page').then(
        (component) => component.HairRegistrationPage,
      ),
  },
  {
    path: 'cong-dong/thu-vien-toc/hien-toc',
    title: 'Đăng ký hiến tóc | Trạm K',
    canActivate: [authGuard],
    data: { mode: 'donate' },
    loadComponent: () =>
      import('@features/community/pages/hair-registration-page/hair-registration-page').then(
        (component) => component.HairRegistrationPage,
      ),
  },
  {
    path: 'cong-dong/chuong-trinh-ho-tro',
    title: 'Các chương trình hỗ trợ | Trạm K',
    loadComponent: () =>
      import('@features/community/pages/community-support-programs-page/community-support-programs-page').then(
        (component) => component.CommunitySupportProgramsPage,
      ),
  },
  {
    path: 'cong-dong/diem-quyen-gop/:regionId',
    title: 'Điểm quyên góp theo khu vực | Trạm K',
    loadComponent: () =>
      import('@features/community/pages/community-hanoi-donation-map-page/community-hanoi-donation-map-page').then(
        (component) => component.CommunityHanoiDonationMapPage,
      ),
  },
  {
    path: 'cong-dong/diem-quyen-gop',
    title: 'Điểm quyên góp | Trạm K',
    loadComponent: () =>
      import('@features/community/pages/community-donation-map-page/community-donation-map-page').then(
        (component) => component.CommunityDonationMapPage,
      ),
  },
  {
    path: 'cong-dong/sao-ke',
    title: 'Chi tiết sao kê quyên góp | Trạm K',
    loadComponent: () =>
      import('@features/community/pages/donation-statement-page/donation-statement-page').then(
        (component) => component.DonationStatementPage,
      ),
  },
  {
    path: 'cong-dong',
    title: 'Cộng đồng | Trạm K',
    loadComponent: () =>
      import('@features/community/pages/community-page/community-page').then(
        (component) => component.CommunityPage,
      ),
  },
  {
    path: 'goc-tam-ly',
    title: 'Góc tâm lý và tinh thần | Trạm K',
    loadComponent: () =>
      import('@features/mental-health/pages/mental-health-page/mental-health-page').then(
        (component) => component.MentalHealthPage,
      ),
  },
  {
    path: 'ho-so/:userId',
    title: 'Hồ sơ thành viên | Trạm K',
    loadComponent: () =>
      import('@features/profile/pages/shared-profile-page/shared-profile-page').then(
        (component) => component.SharedProfilePage,
      ),
  },
  {
    path: 've-chung-toi',
    title: 'Về chúng tôi | Trạm K',
    loadComponent: () =>
      import('@features/about/pages/about-page/about-page').then(
        (component) => component.AboutPage,
      ),
  },
  {
    path: 'tim-kiem',
    title: 'Tìm kiếm | Trạm K',
    loadComponent: () =>
      import('@features/search/pages/search-page/search-page').then(
        (component) => component.SearchPage,
      ),
  },
  {
    path: 'tro-ly-ai',
    title: 'Trợ lý AI | Trạm K',
    loadComponent: () =>
      import('@features/ai-assistant/pages/ai-assistant-page/ai-assistant-page').then(
        (component) => component.AiAssistantPage,
      ),
  },
];

const memberSectionRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'ho-so',
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
    loadComponent: () =>
      import('@features/account/pages/member-posts-page/member-posts-page').then(
        (component) => component.MemberPostsPage,
      ),
  },
  {
    path: 'binh-luan',
    title: 'Bình luận của tôi | Trạm K',
    loadComponent: () =>
      import('@features/account/pages/member-comments-page/member-comments-page').then(
        (component) => component.MemberCommentsPage,
      ),
  },
  {
    path: 'tra-cuu-ma',
    title: 'Tra cứu mã đăng ký | Trạm K',
    loadComponent: loadHairRegistrationLookup,
  },
  {
    path: 'dang-ky-doi-tac',
    title: 'Đăng ký đối tác | Trạm K',
    loadComponent: () =>
      import('@features/account/pages/partner-application-page/partner-application-page').then(
        (component) => component.PartnerApplicationPage,
      ),
  },
  {
    path: 'chuong-trinh-da-dang-ky',
    title: 'Các chương trình đã đăng ký | Trạm K',
    loadComponent: () =>
      import('@features/account/pages/member-registrations-page/member-registrations-page').then(
        (component) => component.MemberRegistrationsPage,
      ),
  },
];

const partnerSectionRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'ho-so',
  },
  {
    path: 'ho-so',
    title: 'Hồ sơ nhà hảo tâm | Trạm K',
    loadComponent: () =>
      import('@features/profile/pages/profile-page/profile-page').then(
        (component) => component.ProfilePage,
      ),
  },
  {
    path: 'bai-viet',
    title: 'Bài viết của tôi | Trạm K',
    loadComponent: () =>
      import('@features/account/pages/member-posts-page/member-posts-page').then(
        (component) => component.MemberPostsPage,
      ),
  },
  {
    path: 'binh-luan',
    title: 'Bình luận của tôi | Trạm K',
    loadComponent: () =>
      import('@features/account/pages/member-comments-page/member-comments-page').then(
        (component) => component.MemberCommentsPage,
      ),
  },
  {
    path: 'tra-cuu-ma',
    title: 'Tra cứu mã đăng ký | Trạm K',
    loadComponent: loadHairRegistrationLookup,
  },
  {
    path: 'chuong-trinh-da-dang-ky',
    title: 'Các chương trình đã đăng ký | Trạm K',
    loadComponent: () =>
      import('@features/account/pages/member-registrations-page/member-registrations-page').then(
        (component) => component.MemberRegistrationsPage,
      ),
  },
  {
    path: 'dang-ky-ho-tro',
    title: 'Đăng ký hỗ trợ | Trạm K',
    loadComponent: () =>
      import('@features/account/pages/partner-support-registration-page/partner-support-registration-page').then(
        (component) => component.PartnerSupportRegistrationPage,
      ),
  },
  {
    path: 'quan-ly-chuong-trinh',
    title: 'Quản lý chương trình từ thiện | Trạm K',
    loadComponent: () =>
      import('@features/account/pages/partner-program-management-page/partner-program-management-page').then(
        (component) => component.PartnerProgramManagementPage,
      ),
  },
];

const adminSectionRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'tong-quan',
  },
  {
    path: 'tong-quan',
    title: 'Tổng quan quản trị | Trạm K',
    loadComponent: () =>
      import('@features/admin/pages/admin-dashboard-page/admin-dashboard-page').then(
        (component) => component.AdminDashboardPage,
      ),
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
    path: 'doi-tac',
    title: 'Hồ sơ đối tác | Trạm K',
    loadComponent: () =>
      import('@features/admin/pages/admin-partner-applications-page/admin-partner-applications-page').then(
        (component) => component.AdminPartnerApplicationsPage,
      ),
  },
  {
    path: 'kiem-duyet',
    title: 'Kiểm duyệt cộng đồng | Trạm K',
    loadComponent: () =>
      import('@features/admin/pages/admin-community-moderation-page/admin-community-moderation-page').then(
        (component) => component.AdminCommunityModerationPage,
      ),
  },
  {
    path: 'noi-dung',
    title: 'Quản lý nội dung | Trạm K',
    loadComponent: () =>
      import('@features/admin/pages/admin-content-management-page/admin-content-management-page').then(
        (component) => component.AdminContentManagementPage,
      ),
  },
  {
    path: 'chuong-trinh',
    title: 'Chương trình hỗ trợ | Trạm K',
    loadComponent: () =>
      import('@features/admin/pages/admin-charity-programs-page/admin-charity-programs-page').then(
        (component) => component.AdminCharityProgramsPage,
      ),
  },
  {
    path: 'hien-nhan-toc',
    title: 'Quản lý hiến và nhận tóc | Trạm K',
    loadComponent: () =>
      import('@features/admin/pages/admin-hair-registrations-page/admin-hair-registrations-page').then(
        (component) => component.AdminHairRegistrationsPage,
      ),
  },
  {
    path: 'diem-phat-com',
    title: 'Điểm tiếp nhận quyên góp | Trạm K',
    loadComponent: () =>
      import('@features/admin/pages/admin-community-locations-page/admin-community-locations-page').then(
        (component) => component.AdminCommunityLocationsPage,
      ),
  },
  {
    path: 'quyen-gop',
    title: 'Quyên góp và sao kê | Trạm K',
    loadComponent: () =>
      import('@features/admin/pages/admin-donations-page/admin-donations-page').then(
        (component) => component.AdminDonationsPage,
      ),
  },
];

export const routes: Routes = [
  {
    path: 'admin/login',
    title: 'Đăng nhập quản trị | Trạm K',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('@features/auth/pages/admin-login-page/admin-login-page').then(
        (component) => component.AdminLoginPage,
      ),
  },
  {
    path: 'admin',
    canActivate: [roleGuard],
    data: { roles: ['ADMIN'], guestRedirect: '/' },
    loadComponent: () =>
      import('@layouts/admin-layout/admin-layout').then((component) => component.AdminLayout),
    children: adminSectionRoutes,
  },
  {
    path: 'doi-tac',
    canActivate: [roleGuard],
    data: { roles: ['PARTNER'] },
    loadComponent: () =>
      import('@layouts/member-layout/member-layout').then((component) => component.MemberLayout),
    children: partnerSectionRoutes,
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
