import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CharityProgramStorageService } from '@features/account/services/charity-program-storage.service';
import { MemberCommentStorageService } from '@features/account/services/member-comment-storage.service';
import { MemberPostStorageService } from '@features/account/services/member-post-storage.service';
import { AdminUsersMockService } from '@features/admin/admin-users-mock.service';
import { HANOI_DONATION_LOCATIONS } from '@features/community/data/hanoi-donation-locations.data';
import { CommunityLocationAdminStorageService } from '@features/community/services/community-location-admin-storage.service';
import { MOCK_CONTENT_ITEMS } from '@features/content/data/content.mock-data';
import { ContentAdminStorageService } from '@features/content/services/content-admin-storage.service';

interface DashboardMetric {
  readonly label: string;
  readonly value: number;
  readonly detail: string;
  readonly path: string;
  readonly tone: 'primary' | 'warning' | 'success' | 'neutral';
}

interface ReviewQueueItem {
  readonly label: string;
  readonly count: number;
  readonly description: string;
  readonly path: string;
}

interface RecentActivity {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly actor: string;
  readonly updatedAt: string;
  readonly path: string;
}

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './admin-dashboard-page.html',
  styleUrl: './admin-dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPage {
  private readonly usersService = inject(AdminUsersMockService);
  private readonly postsStorage = inject(MemberPostStorageService);
  private readonly commentsStorage = inject(MemberCommentStorageService);
  private readonly programsStorage = inject(CharityProgramStorageService);
  private readonly contentStorage = inject(ContentAdminStorageService);
  private readonly locationsStorage = inject(CommunityLocationAdminStorageService);

  private readonly dashboardData = computed(() => {
    const users = this.usersService.list();
    const posts = this.postsStorage.posts();
    const comments = this.commentsStorage.comments();
    const proposals = this.programsStorage.proposals();
    this.contentStorage.changes();
    this.locationsStorage.changes();
    return {
      users,
      posts,
      comments,
      proposals,
      content: this.contentStorage.resolve(MOCK_CONTENT_ITEMS),
      locations: this.locationsStorage.resolve(HANOI_DONATION_LOCATIONS),
    };
  });

  protected readonly metrics = computed<readonly DashboardMetric[]>(() => {
    const { users, posts, comments, proposals, content, locations } = this.dashboardData();

    return [
      {
        label: 'Tổng người dùng',
        value: users.length,
        detail: `${users.filter((user) => user.status === 'PENDING_VERIFY').length} tài khoản chờ xác minh`,
        path: '/admin/nguoi-dung',
        tone: 'primary',
      },
      {
        label: 'Chờ kiểm duyệt',
        value: posts.filter((post) => post.status === 'PENDING').length,
        detail: `${comments.length} bình luận cộng đồng`,
        path: '/admin/kiem-duyet',
        tone: 'warning',
      },
      {
        label: 'Chương trình hỗ trợ',
        value: proposals.length,
        detail: `${proposals.filter((proposal) => proposal.status === 'PENDING').length} đề xuất chờ duyệt`,
        path: '/admin/chuong-trinh',
        tone: 'neutral',
      },
      {
        label: 'Điểm đang tiếp nhận',
        value: locations.filter((location) => location.status === 'ACTIVE').length,
        detail: `${content.filter((item) => item.status === 'PUBLISHED').length} nội dung đang công khai`,
        path: '/admin/diem-phat-com',
        tone: 'success',
      },
    ];
  });

  protected readonly reviewQueue = computed<readonly ReviewQueueItem[]>(() => {
    const { users, posts, proposals, content } = this.dashboardData();

    return [
      {
        label: 'Tài khoản chờ xác minh',
        count: users.filter((user) => user.status === 'PENDING_VERIFY').length,
        description: 'Kiểm tra thông tin và trạng thái tài khoản mới.',
        path: '/admin/nguoi-dung',
      },
      {
        label: 'Bài viết chờ duyệt',
        count: posts.filter((post) => post.status === 'PENDING').length,
        description: 'Xuất bản hoặc yêu cầu thành viên chỉnh sửa.',
        path: '/admin/kiem-duyet',
      },
      {
        label: 'Đề xuất chương trình',
        count: proposals.filter((proposal) => proposal.status === 'PENDING').length,
        description: 'Duyệt chương trình do nhà hảo tâm gửi.',
        path: '/admin/chuong-trinh',
      },
      {
        label: 'Nội dung bản nháp',
        count: content.filter((item) => item.status === 'DRAFT').length,
        description: 'Hoàn thiện nội dung trước khi công khai.',
        path: '/admin/noi-dung',
      },
    ];
  });

  protected readonly recentActivities = computed<readonly RecentActivity[]>(() => {
    const { posts: storedPosts, proposals: storedPrograms } = this.dashboardData();
    const posts = storedPosts.map<RecentActivity>((post) => ({
      id: post.id,
      type: 'Bài viết',
      title: post.title,
      actor: post.authorName,
      updatedAt: post.updatedAt,
      path: '/admin/kiem-duyet',
    }));
    const programs = storedPrograms.map<RecentActivity>((proposal) => ({
      id: proposal.id,
      type: 'Chương trình',
      title: proposal.title,
      actor: proposal.ownerName,
      updatedAt: proposal.updatedAt,
      path: '/admin/chuong-trinh',
    }));

    return [...posts, ...programs]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 5);
  });
}
