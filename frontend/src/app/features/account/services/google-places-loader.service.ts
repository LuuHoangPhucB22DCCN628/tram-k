import { Injectable } from '@angular/core';

export interface GooglePlaceSelection {
  readonly id?: string;
  readonly displayName?: string;
  readonly formattedAddress?: string;
  fetchFields(options: { fields: string[] }): Promise<void>;
}

export interface GooglePlaceAutocompleteElement extends HTMLElement {
  includedRegionCodes: string[];
  placeholder: string;
}

interface GooglePlacesLibrary {
  PlaceAutocompleteElement: new () => GooglePlaceAutocompleteElement;
}

interface GoogleMapsWindow extends Window {
  google?: { maps: { importLibrary(name: string): Promise<GooglePlacesLibrary> } };
  __tramKGoogleMapsReady?: () => void;
}

@Injectable({ providedIn: 'root' })
export class GooglePlacesLoaderService {
  private loading?: Promise<GooglePlacesLibrary>;

  load(apiKey: string): Promise<GooglePlacesLibrary> {
    if (this.loading) return this.loading;
    const mapsWindow = window as GoogleMapsWindow;
    if (mapsWindow.google?.maps.importLibrary) {
      return mapsWindow.google.maps.importLibrary('places');
    }

    this.loading = new Promise<GooglePlacesLibrary>((resolve, reject) => {
      const script = document.createElement('script');
      const query = new URLSearchParams({
        key: apiKey, v: 'weekly', loading: 'async', language: 'vi', region: 'VN',
        callback: '__tramKGoogleMapsReady',
      });
      script.src = `https://maps.googleapis.com/maps/api/js?${query}`;
      script.async = true;
      const timeout = window.setTimeout(() => fail(), 15000);
      const fail = () => {
        window.clearTimeout(timeout);
        delete mapsWindow.__tramKGoogleMapsReady;
        script.remove();
        this.loading = undefined;
        reject(new Error('Google Maps chưa sẵn sàng.'));
      };
      script.onerror = fail;
      mapsWindow.__tramKGoogleMapsReady = () => {
        window.clearTimeout(timeout);
        delete mapsWindow.__tramKGoogleMapsReady;
        if (!mapsWindow.google?.maps.importLibrary) return fail();
        mapsWindow.google.maps.importLibrary('places').then(resolve, fail);
      };
      document.head.appendChild(script);
    });
    return this.loading;
  }
}
