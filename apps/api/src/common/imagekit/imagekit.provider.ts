import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ImageKit from 'imagekit';

export const IMAGEKIT_CLIENT = 'IMAGEKIT_CLIENT';

export const ImageKitProvider: Provider = {
  provide: IMAGEKIT_CLIENT,
  useFactory: (config: ConfigService) => {
    return new ImageKit({
      publicKey: config.getOrThrow<string>('IMAGEKIT_PUBLIC_KEY'),
      privateKey: config.getOrThrow<string>('IMAGEKIT_PRIVATE_KEY'),
      urlEndpoint: config.getOrThrow<string>('IMAGEKIT_URL_ENDPOINT'),
    });
  },
  inject: [ConfigService],
};