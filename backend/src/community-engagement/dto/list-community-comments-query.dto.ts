
import { Transform, Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";

export class ListCommunityCommentsQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined) return 20;

        const limit = Number(value);

        if (!Number.isInteger(limit)) {
            return value;
        }

        return Math.min(limit, 50);
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit = 20;
}
