import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';
import type { MemberComment } from '../models/member-comment.models';
import type {
  CommunityReactionCounts,
  CommunityReactionType,
} from '../models/community-reaction.models';

interface ApiResponse<T> {
  readonly success: true;
  readonly data: T;
}
interface RemoteComment {
  readonly id: string;
  readonly userId: string;
  readonly user?: {
    readonly fullName: string;
    readonly profile?: { readonly visibility: 'PUBLIC' | 'MEMBERS' | 'PRIVATE' } | null;
  };
  readonly content: string;
  readonly sourceTitle: string;
  readonly sourcePath: string;
  readonly parentId: string | null;
  readonly deletedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly replies?: readonly RemoteComment[];
}

@Injectable({ providedIn: 'root' })
export class CommunityEngagementApiService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly base = (inject(API_BASE_URL, { optional: true }) ?? '').replace(/\/$/, '');
  readonly available = !!this.http && !!this.base;
  readonly lastCommentError = signal('');

  listComments(sourceKey: string): Observable<readonly MemberComment[] | null> {
    if (!this.http || !this.base) return of(null);
    return this.http
      .get<ApiResponse<readonly RemoteComment[]>>(`${this.storyUrl(sourceKey)}/comments`)
      .pipe(
        map(({ data }) =>
          data.flatMap((root) => [
            this.mapComment(root),
            ...(root.replies ?? []).map((reply) => this.mapComment(reply)),
          ]),
        ),
        catchError(() => of(null)),
      );
  }

  adminComments(): Observable<readonly MemberComment[] | null> {
    if (!this.http || !this.base) return of(null);
    return this.http
      .get<ApiResponse<readonly RemoteComment[]>>(`${this.base}/community/stories/admin/comments`)
      .pipe(
        map(({ data }) => data.map((comment) => this.mapComment(comment))),
        catchError(() => of(null)),
      );
  }

  mineComments(): Observable<readonly MemberComment[] | null> {
    if (!this.http || !this.base) return of(null);
    return this.http
      .get<ApiResponse<readonly RemoteComment[]>>(`${this.base}/community/stories/mine/comments`)
      .pipe(
        map(({ data }) => data.map((comment) => this.mapComment(comment))),
        catchError(() => of(null)),
      );
  }

  moderateRemoveComment(commentId: string): Observable<boolean> {
    if (!this.http || !this.base) return of(false);
    return this.http
      .delete<ApiResponse<RemoteComment>>(
        `${this.base}/community/stories/admin/comments/${encodeURIComponent(commentId)}`,
      )
      .pipe(
        map(({ data }) => !!data.deletedAt),
        catchError(() => of(false)),
      );
  }

  createComment(
    sourceKey: string,
    input: {
      readonly content: string;
      readonly sourceTitle: string;
      readonly sourcePath: string;
      readonly parentId?: string;
      readonly idempotencyKey?: string;
    },
  ): Observable<MemberComment | null> {
    this.lastCommentError.set('');
    if (!this.http || !this.base) {
      this.lastCommentError.set('Chưa kết nối được máy chủ. Vui lòng thử lại sau.');
      return of(null);
    }
    return this.http
      .post<ApiResponse<RemoteComment>>(`${this.storyUrl(sourceKey)}/comments`, {
        content: input.content,
        sourceTitle: input.sourceTitle,
        sourcePath: input.sourcePath,
        ...(input.parentId ? { parentId: input.parentId } : {}),
        idempotencyKey: input.idempotencyKey ?? crypto.randomUUID(),
      })
      .pipe(
        map(({ data }) => this.mapComment(data)),
        catchError((error: HttpErrorResponse) => {
          const message =
            error.status === 0
              ? 'Không kết nối được máy chủ. Vui lòng kiểm tra backend rồi thử lại.'
              : error.status === 401
                ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để bình luận.'
                : error.status === 403
                  ? 'Tài khoản hiện không có quyền bình luận.'
                  : error.status === 404
                    ? 'Câu chuyện hoặc bình luận gốc không còn khả dụng. Vui lòng tải lại trang.'
                    : error.status === 429
                      ? 'Bạn đang bình luận quá nhanh. Vui lòng thử lại sau.'
                      : error.status === 400
                        ? 'Thông tin bình luận chưa hợp lệ. Vui lòng tải lại trang và thử lại.'
                        : 'Chưa đăng được bình luận lên máy chủ. Vui lòng thử lại.';
          this.lastCommentError.set(message);
          return of(null);
        }),
      );
  }

  updateComment(commentId: string, content: string): Observable<MemberComment | null> {
    if (!this.http || !this.base) return of(null);
    return this.http
      .patch<ApiResponse<RemoteComment>>(
        `${this.base}/community/stories/comments/${encodeURIComponent(commentId)}`,
        { content },
      )
      .pipe(
        map(({ data }) => this.mapComment(data)),
        catchError(() => of(null)),
      );
  }

  removeComment(commentId: string): Observable<boolean> {
    if (!this.http || !this.base) return of(false as const);
    return this.http
      .delete<ApiResponse<RemoteComment>>(
        `${this.base}/community/stories/comments/${encodeURIComponent(commentId)}`,
      )
      .pipe(
        map(({ data }) => !!data.deletedAt),
        catchError(() => of(false)),
      );
  }

  reactionSummary(sourceKey: string): Observable<CommunityReactionCounts | null> {
    if (!this.http || !this.base) return of(null);
    return this.http
      .get<ApiResponse<CommunityReactionCounts>>(`${this.storyUrl(sourceKey)}/reactions`)
      .pipe(
        map(({ data }) => data),
        catchError(() => of(null)),
      );
  }

  myReaction(sourceKey: string): Observable<CommunityReactionType | null> {
    if (!this.http || !this.base) return of(null);
    return this.http
      .get<ApiResponse<{ readonly type: CommunityReactionType | null }>>(
        `${this.storyUrl(sourceKey)}/reactions/mine`,
      )
      .pipe(
        map(({ data }) => data.type),
        catchError(() => of(null)),
      );
  }

  toggleReaction(
    sourceKey: string,
    type: CommunityReactionType,
  ): Observable<CommunityReactionType | null | false> {
    if (!this.http || !this.base) return of(false as const);
    return this.http
      .post<ApiResponse<{ readonly type: CommunityReactionType } | null>>(
        `${this.storyUrl(sourceKey)}/reactions/toggle`,
        { type },
      )
      .pipe(
        map(({ data }) => data?.type ?? null),
        catchError(() => of(false as const)),
      );
  }

  importReaction(
    sourceKey: string,
    type: CommunityReactionType,
  ): Observable<CommunityReactionType | null> {
    if (!this.http || !this.base) return of(null);
    return this.http
      .post<ApiResponse<{ readonly type: CommunityReactionType }>>(
        `${this.storyUrl(sourceKey)}/reactions/import`,
        { type },
      )
      .pipe(
        map(({ data }) => data.type),
        catchError(() => of(null)),
      );
  }

  private storyUrl(sourceKey: string): string {
    return `${this.base}/community/stories/${encodeURIComponent(sourceKey)}`;
  }

  private mapComment(value: RemoteComment): MemberComment {
    return {
      id: value.id,
      userId: value.userId,
      authorName: value.user?.fullName ?? 'Thành viên Trạm K',
      profileVisibility: value.user?.profile?.visibility,
      content: value.content,
      sourceTitle: value.sourceTitle,
      sourcePath: value.sourcePath,
      parentId: value.parentId ?? undefined,
      deletedAt: value.deletedAt ?? undefined,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    };
  }
}
