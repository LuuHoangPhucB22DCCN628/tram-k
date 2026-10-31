import { Component } from '@angular/core'; // Khai báo Angular component
import { RouterOutlet } from '@angular/router'; // Hiển thị trang con theo route

import { AiChatWidget } from '@features/ai-assistant/components/ai-chat-widget/ai-chat-widget';
import { PublicFooter } from '@shared/components/public-footer/public-footer'; // Footer dùng chung
import { PublicHeader } from '@shared/components/public-header/public-header'; // Header dùng chung

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [PublicHeader, PublicFooter, RouterOutlet, AiChatWidget], // Cho phép layout dùng header, footer, chat và router-outlet
  templateUrl: './public-layout.html',
})
export class PublicLayout {}
