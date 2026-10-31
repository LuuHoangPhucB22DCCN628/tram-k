import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';
import type { CreateMemberPostInput, MemberPost } from '../models/member-post.models';

interface ApiResponse<T> { readonly success: true; readonly data: T }

@Injectable({ providedIn: 'root' })
export class MemberPostApiService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly base = (inject(API_BASE_URL, { optional: true }) ?? '').replace(/\/$/, '');
  readonly available = !!this.http && !!this.base;

  publicPosts(): Observable<readonly MemberPost[] | null> {
    if (!this.http || !this.base) return of(null);
    return this.http.get<ApiResponse<readonly MemberPost[]>>(`${this.base}/member-posts/public`)
      .pipe(map(({ data }) => data), catchError(() => of(null)));
  }

  mine(): Observable<readonly MemberPost[] | null> {
    if (!this.http || !this.base) return of(null);
    return this.http.get<ApiResponse<readonly MemberPost[]>>(`${this.base}/member-posts/mine`)
      .pipe(map(({ data }) => data), catchError(() => of(null)));
  }

  admin(): Observable<readonly MemberPost[] | null> {
    if (!this.http || !this.base) return of(null);
    return this.http.get<ApiResponse<readonly MemberPost[]>>(`${this.base}/member-posts/admin`)
      .pipe(map(({ data }) => data), catchError(() => of(null)));
  }

  create(input: CreateMemberPostInput & { readonly legacyId?: string }): Observable<MemberPost | null> {
    if (!this.http || !this.base) return of(null);
    return this.http.post<ApiResponse<MemberPost>>(`${this.base}/member-posts/mine`, input)
      .pipe(map(({ data }) => data), catchError(() => of(null)));
  }

  submit(postId: string): Observable<MemberPost | null> {
    if (!this.http || !this.base) return of(null);
    return this.http.patch<ApiResponse<MemberPost>>(
      `${this.base}/member-posts/mine/${encodeURIComponent(postId)}/submit`, {},
    ).pipe(map(({ data }) => data), catchError(() => of(null)));
  }

  remove(postId: string): Observable<boolean> {
    if (!this.http || !this.base) return of(false);
    return this.http.delete<ApiResponse<{ deleted: boolean }>>(
      `${this.base}/member-posts/mine/${encodeURIComponent(postId)}`,
    ).pipe(map(({ data }) => data.deleted), catchError(() => of(false)));
  }

  review(postId: string, decision: 'PUBLISHED' | 'REJECTED', reason: string): Observable<MemberPost | null> {
    if (!this.http || !this.base) return of(null);
    return this.http.patch<ApiResponse<MemberPost>>(
      `${this.base}/member-posts/admin/${encodeURIComponent(postId)}/review`,
      { decision, reason },
    ).pipe(map(({ data }) => data), catchError(() => of(null)));
  }
}
