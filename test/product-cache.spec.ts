import { describe, expect, it } from '@jest/globals';
import { ProductCacheService } from '../src/modules/products/product-cache.service.js';
import { createCache } from 'cache-manager';
import Keyv from 'keyv';

describe('Catalog cache generations', () => {
  it('cannot repopulate the current generation with an old in-flight read', async () => {
    const cache = new ProductCacheService(createCache({ stores: [new Keyv()] }));
    let finish!: (value: string) => void;
    let loaded!: () => void;
    const started = new Promise<void>(resolve => { loaded = resolve; });
    const oldRead = cache.getOrLoad('detail:1', () => new Promise<string>(resolve => { finish = resolve; loaded(); }));
    await started;
    cache.invalidate();
    finish('old');
    expect(await oldRead).toBe('old');
    expect(await cache.getOrLoad('detail:1', async () => 'new')).toBe('new');
    expect(await cache.getOrLoad('detail:1', async () => 'unexpected')).toBe('new');
  });
});
