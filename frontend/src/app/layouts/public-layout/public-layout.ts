import { Component } from '@angular/core'; // Khai báo Angular component
import { RouterOutlet } from '@angular/router'; // Hiển thị trang con theo route

import { PublicFooter } from '@shared/components/public-footer/public-footer'; // Footer dùng chung
import { PublicHeader } from '@shared/components/public-header/public-header'; // Header dùng chung

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [PublicHeader, PublicFooter, RouterOutlet], // Cho phép layout dùng header, footer và router-outlet
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.scss',
})
export class PublicLayout {}
