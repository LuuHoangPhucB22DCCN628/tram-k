export interface SocialLink {
  readonly name: string;
  readonly icon: string;
  readonly url: string;
}

// URL tạm theo yêu cầu của Phúc; thay riêng từng kênh khi có tài khoản chính thức.
const TEMP_CONTACT_URL = 'https://www.facebook.com/phuccluu271';
export const SOCIAL_LINKS: readonly SocialLink[] = [
  { name: 'Instagram', icon: '/assets/icons/instagram.svg', url: TEMP_CONTACT_URL },
  { name: 'Facebook', icon: '/assets/icons/facebook.svg', url: TEMP_CONTACT_URL },
  { name: 'Telegram', icon: '/assets/icons/telegram.svg', url: TEMP_CONTACT_URL },
  { name: 'WhatsApp', icon: '/assets/icons/whatsapp.svg', url: TEMP_CONTACT_URL },
  { name: 'TikTok', icon: '/assets/icons/tiktok.svg', url: TEMP_CONTACT_URL },
];
