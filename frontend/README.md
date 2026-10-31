# Frontend

## Gợi ý địa chỉ Google Maps cho chương trình hỗ trợ

Form đối tác yêu cầu địa chỉ tổ chức cụ thể. Google Places Autocomplete (New) có thể gợi ý địa điểm tại Việt Nam; khi chọn, form lưu địa chỉ hiển thị và Place ID để tạo liên kết chỉ đường chính xác. Nếu chưa cấu hình Google Maps, form có liên kết mở Google Maps để tra địa chỉ rồi nhập thủ công; quản trị viên vẫn kiểm tra trước khi công khai.

Để bật gợi ý, tạo API key trình duyệt trong Google Cloud, bật **Maps JavaScript API** và **Places API (New)**, rồi điền key vào `googleMapsApiKey` trong `src/environments/environment.ts` (và `environment.production.ts` cho bản triển khai). Giới hạn key theo **HTTP referrers** (`http://localhost:4200/*`, địa chỉ triển khai thực tế) và chỉ các API cần dùng. Không đưa key chưa giới hạn vào mã nguồn đã đẩy lên Git. Google Maps Platform có thể yêu cầu bật billing và tính phí theo mức sử dụng; đặt hạn mức/ngân sách trước khi dùng thật. Trường cấu hình để trống mặc định nhằm tránh phát sinh yêu cầu tính phí ngoài ý muốn.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.19.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
