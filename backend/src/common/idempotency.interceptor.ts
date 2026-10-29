import { Cache } from 'cache-manager';

import {
    BadRequestException,
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, of, from } from "rxjs";
import { switchMap } from "rxjs/operators";

import { IdempotencyService } from "./idempotency.service";

export const IDEMPOTENT_OPERATION = "idempotent_operation";

export const Idempotent = (operation: string) =>
    SetMetadata(IDEMPOTENT_OPERATION, operation);
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
    constructor(
        private readonly idempotency: IdempotencyService,
        private readonly reflector: Reflector,
    ) { }


    async intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Promise<Observable<any>> {

        console.log("[IDEM] Interceptor hit:", {
            handler: context.getHandler().name,
            operation: this.reflector.get<string>(
                IDEMPOTENT_OPERATION,
                context.getHandler(),
            ),
        });

        const operation = this.reflector.get<string>(
            IDEMPOTENT_OPERATION,
            context.getHandler(),
        );

        if (!operation) return next.handle();

        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();

        const key = request.headers["x-idempotency-key"];

        if (!key || typeof key !== "string") {
            throw new BadRequestException("Yêu cầu bắt buộc phải có header x-idempotency-key");
        }

        const actorScope = request.user?.id
            ? `user:${request.user.id}`
            : `guest:${request.ip}`;

        const payloadHash = this.idempotency.hashPayload({
            params: request.params,
            query: request.query,
            body: request.body,
        });

        const cached = await this.idempotency.validateOrThrow(
            actorScope,
            operation,
            key,
            payloadHash,
        );
        console.log("[IDEM] Cache lookup:", {
            key,
            actorScope,
            operation,
            payloadHash,
            cacheHit: !!cached,
            cachedStatus: cached?.responseStatus,
        });

        if (cached) {
            response.status(cached.responseStatus);
            return of(cached.responseBody);
        }

        return next.handle().pipe(
            switchMap((body) => {
                const statusCode = response.statusCode;

                if (statusCode < 200 || statusCode >= 300) {
                    return of(body);
                }

                return from(
                    this.idempotency
                        .saveRecord(
                            actorScope,
                            operation,
                            key,
                            payloadHash,
                            statusCode,
                            body,
                        )
                        .then(() => body),
                );
            }),
        );
    }
}
