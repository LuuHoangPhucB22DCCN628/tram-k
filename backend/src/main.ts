import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { json, urlencoded } from "express";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.use(json({ limit: "1mb" }));
  app.use(urlencoded({ extended: true, limit: "1mb" }));
  const config = app.get(ConfigService);
  const port = config.get<number>("PORT", 3000);
  const configuredOrigins = config
    .get<string>("CORS_ORIGINS", "http://localhost:4200,http://localhost:4201")
    .split(",")
    .map((origin) => origin.trim());
  const developmentOrigins =
    config.get<string>("NODE_ENV", "development") === "production"
      ? []
      : [
        "http://localhost:4200",
        "http://127.0.0.1:4200",
        "http://localhost:4201",
        "http://127.0.0.1:4201",
        "http://localhost:4203",
        "http://127.0.0.1:4203",
      ];

  app.enableCors({
    origin: [...new Set([...configuredOrigins, ...developmentOrigins])],
    credentials: true,
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Trạm K API")
    .setDescription(
      "REST API cho nền tảng đồng hành cùng bệnh nhân ung thư Trạm K",
    )
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    "docs",
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );
  await app.listen(port);
}

void bootstrap();
