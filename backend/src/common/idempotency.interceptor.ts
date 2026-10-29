import { BadRequestException, CallHandler, ExecutionContext, Injectable, NestInterceptor, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, from, of, throwError } from "rxjs";
import { switchMap, catchError } from "rxjs/operators";
import { IdempotencyService } from "./idempotency.service";
import { IdempotencyStatus } from "@prisma/client";

export const Idempotent = (operation: string) => SetMetadata("idempotent_operation", operation);
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
    constructor(private readonly idempotency: IdempotencyService, private readonly reflector: Reflector) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const operation = this.reflector.get<string>("idempotent_operation", context.getHandler());
        if (!operation) return next.handle();

        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const key = request.headers["x-idempotency-key"];

        if (!key || typeof key !== "string") {
            throw new BadRequestException("Yêu cầu bắt buộc phải có header 'x-idempotency-key'.");
        }

        const actorScope = request.user?.id ? `user:${request.user.id}` : `guest:${request.ip}`;

        const payloadHash = this.idempotency.hashPayload({
            params: request.params,
            query: request.query,
            body: request.body,
        });

        // Bọc toàn bộ quá trình bất đồng bộ vào một Observable
        return from(this.idempotency.claim(actorScope, operation, key, payloadHash)).pipe(
            switchMap((cached) => {
                if (cached && cached.status === IdempotencyStatus.COMPLETED) {
                    if (typeof response.status === 'function') {
                        response.status(cached.responseStatus);
                    }
                    return of(cached.responseBody);
                }

                // Nếu chưa có cache, cho request đi tiếp
                return next.handle().pipe(
                    switchMap((res) => {
                        const statusCode = response.statusCode || 200;
                        if (statusCode >= 200 && statusCode < 300) {
                            return from(
                                this.idempotency.complete(actorScope, operation, key, statusCode, res as any).then(() => res)
                            );
                        }
                        return of(res);
                    }),
                    catchError((error) => {
                        // Nếu nghiệp vụ lỗi, xóa key đi để user có thể sửa và gửi lại
                        this.idempotency.remove(actorScope, operation, key).catch(() => undefined);
                        return throwError(() => error);
                    })
                );
            })
        );
    }
}