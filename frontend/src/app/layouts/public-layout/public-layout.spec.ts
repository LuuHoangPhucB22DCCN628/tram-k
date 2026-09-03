import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router'; // Cung cấp Router cho PublicHeader và RouterOutlet

import { PublicLayout } from './public-layout';

describe('PublicLayout', () => {
  let component: PublicLayout;
  let fixture: ComponentFixture<PublicLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicLayout],
      providers: [provideRouter([])], // Tạo Router rỗng cho môi trường kiểm thử
    }).compileComponents();

    fixture = TestBed.createComponent(PublicLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
