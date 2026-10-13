import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { SOCIAL_LINKS } from '@core/config/social-links';
import { RevealDirective } from '@shared/directives/reveal.directive';
import { UiModal, UiSectionMore } from '@shared/ui';
import {
  EXPANDED_SECTION_PAGE_SIZE,
  paginateItems,
  parsePaginationPage,
  updatePaginationUrl,
} from '@shared/utils/pagination';
import { StoryShare } from '../../components/story-share/story-share';
import { PODCAST_LIBRARY_LIMIT, type PodcastItem } from '../../models/podcast.models';
import { PublishedPodcastService } from '../../services/published-podcast.service';

@Component({
  selector: 'app-mental-health-page',
  standalone: true,
  imports: [UiModal, UiSectionMore, StoryShare, RevealDirective],
  templateUrl: './mental-health-page.html',
  styleUrl: './mental-health-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MentalHealthPage implements OnDestroy {
  private readonly podcastLibrary = inject(PublishedPodcastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private playbackTimer?: ReturnType<typeof setInterval>;
  private narration?: SpeechSynthesisUtterance;
  private podcastAudio?: HTMLAudioElement;

  private readonly narrationText =
    'Nếu hôm nay bạn vừa nhận kết quả ung thư, hãy cho phép mình dừng lại một chút và hít thở thật sâu. Ra trận thì chỉ có chiến thắng thôi. Nếu không chiến thắng, chắc chắn là tử trận. Cho nên bằng mọi giá là phải chiến thắng. Bạn không cần phải mạnh mẽ trong mọi khoảnh khắc. Hãy đi từng bước nhỏ, lắng nghe cơ thể và để những người yêu thương được đồng hành cùng bạn.';

  protected readonly durationSeconds = 7 * 60;
  protected readonly currentTime = signal(0);
  protected readonly isPlaying = signal(false);
  protected readonly progress = computed(() => (this.currentTime() / this.durationSeconds) * 100);
  protected readonly formattedCurrentTime = computed(() => this.formatTime(this.currentTime()));
  protected readonly formattedDuration = this.formatTime(this.durationSeconds);
  protected readonly playbackMessage = signal('');
  protected readonly selectedPodcast = signal<PodcastItem | null>(null);
  protected readonly isPodcastPreviewPlaying = signal(false);
  protected readonly podcastPreviewMessage = signal('');
  protected readonly showAllPodcasts = signal(false);
  protected readonly podcastPage = signal(1);
  protected readonly socialLinks = [...SOCIAL_LINKS];
  protected readonly allPodcasts = computed(() => {
    return this.podcastLibrary.items();
  });
  protected readonly podcastPagination = computed(() =>
    paginateItems(this.allPodcasts(), this.podcastPage(), EXPANDED_SECTION_PAGE_SIZE),
  );
  protected readonly podcasts = computed(() =>
    this.showAllPodcasts()
      ? this.podcastPagination().items
      : this.allPodcasts().slice(0, PODCAST_LIBRARY_LIMIT),
  );
  protected readonly remainingPodcastCount = computed(() =>
    Math.max(this.allPodcasts().length - PODCAST_LIBRARY_LIMIT, 0),
  );

  constructor() {
    const initialPage = parsePaginationPage(this.route.snapshot.queryParamMap.get('podcastPage'));
    if (initialPage) {
      this.podcastPage.set(initialPage);
      this.showAllPodcasts.set(true);
    }

    const requestedPodcast = this.route.snapshot.queryParamMap.get('podcast');
    const podcast = this.allPodcasts().find((item) => item.id === requestedPodcast);
    if (podcast) this.selectedPodcast.set(podcast);
  }

  protected togglePodcastLibrary(): void {
    const expanded = !this.showAllPodcasts();
    this.podcastPage.set(1);
    this.showAllPodcasts.set(expanded);
    void updatePaginationUrl(this.router, this.route, 'podcastPage', expanded ? 1 : null);
  }

  protected selectPodcastPage(page: number): void {
    this.podcastPage.set(page);
    void updatePaginationUrl(this.router, this.route, 'podcastPage', page);
  }

  protected togglePlayback(): void {
    if (this.isPlaying()) {
      this.pausePlayback();
      return;
    }

    if (!this.canUseSpeechSynthesis()) {
      this.playbackMessage.set('Trình duyệt này không hỗ trợ phát giọng đọc.');
      return;
    }

    this.playbackMessage.set('');
    const speechSynthesis = window.speechSynthesis;
    this.stopPodcastPreview();

    if (speechSynthesis.paused && this.narration) {
      speechSynthesis.resume();
    } else {
      this.startNarration(speechSynthesis);
    }

    this.isPlaying.set(true);
    this.startPlaybackTimer();
  }

  protected openPodcast(podcast: PodcastItem): void {
    this.stopPodcastPreview();
    this.podcastPreviewMessage.set('');
    this.selectedPodcast.set(podcast);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { podcast: podcast.id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected closePodcast(): void {
    this.stopPodcastPreview();
    this.selectedPodcast.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { podcast: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected togglePodcastPreview(): void {
    if (this.isPodcastPreviewPlaying()) {
      this.stopPodcastPreview();
      return;
    }

    const podcast = this.selectedPodcast();
    if (!podcast) return;

    this.pausePlayback();
    this.podcastPreviewMessage.set('');
    if (podcast.audioUrl) {
      this.playPodcastAudio(podcast.audioUrl);
      return;
    }

    if (!this.canUseSpeechSynthesis()) {
      this.playbackMessage.set('Trình duyệt này không hỗ trợ phát giọng đọc.');
      return;
    }

    const speechSynthesis = window.speechSynthesis;
    speechSynthesis.cancel();

    const narration = this.createNarration(
      `${podcast.title}. ${podcast.description}. Nguồn: ${podcast.source}.`,
    );
    narration.onend = () => this.finishPodcastPreview();
    narration.onerror = () => {
      this.playbackMessage.set('Không thể phát giọng đọc. Vui lòng thử lại.');
      this.finishPodcastPreview();
    };

    this.narration = narration;
    this.isPodcastPreviewPlaying.set(true);
    speechSynthesis.speak(narration);
  }

  ngOnDestroy(): void {
    this.clearPlaybackTimer();
    if (this.canUseSpeechSynthesis()) {
      window.speechSynthesis.cancel();
    }
  }

  private startPlaybackTimer(): void {
    this.clearPlaybackTimer();
    this.playbackTimer = setInterval(() => {
      const nextTime = this.currentTime() + 1;
      if (nextTime >= this.durationSeconds) {
        this.currentTime.set(this.durationSeconds);
        this.pausePlayback();
        return;
      }
      this.currentTime.set(nextTime);
    }, 1000);
  }

  private startNarration(speechSynthesis: SpeechSynthesis): void {
    speechSynthesis.cancel();
    this.currentTime.set(0);

    const narration = this.createNarration(this.narrationText);

    narration.onend = () => {
      this.currentTime.set(this.durationSeconds);
      this.finishPlayback();
    };
    narration.onerror = () => {
      this.playbackMessage.set('Không thể phát giọng đọc. Vui lòng thử lại.');
      this.finishPlayback();
    };

    this.narration = narration;
    speechSynthesis.speak(narration);
  }

  private createNarration(text: string): SpeechSynthesisUtterance {
    const narration = new SpeechSynthesisUtterance(text);
    narration.lang = 'vi-VN';
    narration.rate = 0.92;
    narration.pitch = 1;
    narration.volume = 1;

    const vietnameseVoice = window.speechSynthesis
      .getVoices()
      .find((voice) => voice.lang.toLowerCase().startsWith('vi'));
    if (vietnameseVoice) narration.voice = vietnameseVoice;

    return narration;
  }

  private pausePlayback(): void {
    this.isPlaying.set(false);
    this.clearPlaybackTimer();
    if (this.canUseSpeechSynthesis() && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  }

  private finishPlayback(): void {
    this.isPlaying.set(false);
    this.clearPlaybackTimer();
    this.narration = undefined;
  }

  private stopPodcastPreview(): void {
    if (this.podcastAudio) {
      this.podcastAudio.pause();
      this.podcastAudio.currentTime = 0;
      this.podcastAudio = undefined;
    }
    if (!this.isPodcastPreviewPlaying()) return;
    if (this.canUseSpeechSynthesis()) window.speechSynthesis.cancel();
    this.finishPodcastPreview();
  }

  private finishPodcastPreview(): void {
    this.isPodcastPreviewPlaying.set(false);
    this.narration = undefined;
  }

  private playPodcastAudio(audioUrl: string): void {
    const audio = new Audio(audioUrl);
    audio.onended = () => this.finishPodcastPreview();
    audio.onerror = () => {
      this.podcastPreviewMessage.set('Không thể phát tệp âm thanh. Vui lòng thử lại.');
      this.finishPodcastPreview();
    };
    this.podcastAudio = audio;
    this.isPodcastPreviewPlaying.set(true);
    void audio.play().catch(() => {
      this.podcastPreviewMessage.set('Trình duyệt đã chặn phát âm thanh. Hãy bấm nghe lại.');
      this.finishPodcastPreview();
    });
  }

  private clearPlaybackTimer(): void {
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = undefined;
    }
  }

  private canUseSpeechSynthesis(): boolean {
    return (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof SpeechSynthesisUtterance !== 'undefined'
    );
  }

  private formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
