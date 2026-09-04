import { ComponentFixture, TestBed } from '@angular/core/testing'; // Công cụ kiểm thử component
import { provideRouter } from '@angular/router'; // Cung cấp Router cho routerLink trong template

import { PublicHeader } from './public-header'; // Component cần kiểm thử

describe('PublicHeader', () => {
  let component: PublicHeader; // Biến truy cập class của component
  let fixture: ComponentFixture<PublicHeader>; // Biến truy cập giao diện kiểm thử

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicHeader], // Nạp standalone component vào môi trường test
      providers: [provideRouter([])], // Tạo Router rỗng để routerLink hoạt động
    }).compileComponents();

    fixture = TestBed.createComponent(PublicHeader); // Khởi tạo component
    component = fixture.componentInstance; // Lấy instance của component
    fixture.detectChanges(); // Cập nhật giao diện lần đầu
  });

  it('should create', () => {
    expect(component).toBeTruthy(); // Xác nhận component được tạo thành công
  });

  it('should toggle the mobile menu', () => {
    expect(component.isMobileMenuOpen()).toBe(false); // Menu đóng khi mới mở trang

    component.toggleMobileMenu(); // Mô phỏng người dùng bấm nút menu
    expect(component.isMobileMenuOpen()).toBe(true); // Menu được mở

    component.closeMobileMenu(); // Mô phỏng chọn liên kết hoặc đóng menu
    expect(component.isMobileMenuOpen()).toBe(false); // Menu trở lại trạng thái đóng
  });
});
