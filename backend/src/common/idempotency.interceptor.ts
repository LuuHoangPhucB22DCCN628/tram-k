import {
    CallHandler,
    ConflictException,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, tap } from "rxjs";
import { map } from "rxjs/operators";

import { IdempotencyService } from "./idempotency.service";

export const Idempotent = (operation: string) =>
    Reflect.metadata("idempotent_operation", operation);

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
    constructor(
        private readonly idempotency: IdempotencyService,
        private readonly reflector: Reflector,
    ) { }

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const operation = this.reflector.get<string>(
            "idempotent_operation",
            context.getHandler(),
        );

        if (!operation) return next.handle();

        const request = context.switchToHttp().getRequest();
        const key = request.headers["x-idempotency-key"];

        if (!key || typeof key !== "string") return next.handle();

        const actorScope = request.user?.id
            ? `user:${request.user.id}`
            : `guest:${request.ip}`;

        const payloadHash = this.idempotency.hashPayload(request.body);

        const cached = await this.idempotency.validateOrThrow(
            actorScope,
            operation,
            key,
            payloadHash,
        );

        if (cached) {
            return new Observable((subscriber) => {
                subscriber.next(cached.responseBody);
                subscriber.complete();
            });
        }

        return next.handle().pipe(
            tap(async (response) => {
                const statusCode = context.switchToHttp().getResponse().statusCode;
                if (statusCode >= 200 && statusCode < 300) {
                    await this.idempotency.saveRecord(
                        actorScope,
                        operation,
                        key,
                        payloadHash,
                        statusCode,
                        response as any,
                    );
                }
            }),
        );
    }
}