import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';

import { MediaUploadApiService } from './media-upload-api.service';

describe('MediaUploadApiService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:3000' },
      ],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('uploads a file as multipart data and returns its shared URL', async () => {
    const service = TestBed.inject(MediaUploadApiService);
    const file = new File(['image'], 'cover.png', { type: 'image/png' });
    const resultPromise = firstValueFrom(service.upload(file, 'image'));
    const request = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/media/upload?kind=image',
    );

    expect(request.request.body).toBeInstanceOf(FormData);
    const uploadedFile = (request.request.body as FormData).get('file') as File;
    expect(uploadedFile.name).toBe(file.name);
    expect(uploadedFile.type).toBe(file.type);
    request.flush({
      success: true,
      data: {
        fileName: '8bfe4120-0eb0-45ed-9922-15e88071f783.png',
        mimeType: 'image/png',
        size: file.size,
        url: 'http://localhost:3000/media/8bfe4120-0eb0-45ed-9922-15e88071f783.png',
      },
    });

    await expect(resultPromise).resolves.toMatchObject({ mimeType: 'image/png' });
    expect(service.lastError()).toBe('');
  });

  it('keeps the local preview flow usable when the upload fails', async () => {
    const service = TestBed.inject(MediaUploadApiService);
    const resultPromise = firstValueFrom(
      service.upload(new File(['audio'], 'episode.mp3', { type: 'audio/mpeg' }), 'audio'),
    );
    TestBed.inject(HttpTestingController)
      .expectOne('http://localhost:3000/media/upload?kind=audio')
      .error(new ProgressEvent('network error'));

    await expect(resultPromise).resolves.toBeNull();
    expect(service.lastError()).toContain('chưa tải được lên máy chủ');
  });
});
