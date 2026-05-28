import { RenderCache } from '../src/cache';

describe('RenderCache', () => {
  let cache: RenderCache;

  beforeEach(() => {
    cache = new RenderCache();
  });

  it('returns null for a key that has never been set', () => {
    expect(cache.get('/nonexistent')).toBeNull();
  });

  it('stores and retrieves a value', () => {
    cache.set('/products/shoes', '<html>shoes</html>', 60);
    expect(cache.get('/products/shoes')).toBe('<html>shoes</html>');
  });

  it('returns null for an expired entry', () => {
    // TTL of -1 second means it expired immediately
    cache.set('/expired', '<html>gone</html>', -1);
    expect(cache.get('/expired')).toBeNull();
  });

  it('evicts the entry from the store when it is expired on get()', () => {
    cache.set('/evict-me', '<html>x</html>', -1);
    cache.get('/evict-me'); // trigger eviction
    expect(cache.size()).toBe(0);
  });

  it('does not evict a valid (non-expired) entry', () => {
    cache.set('/valid', '<html>y</html>', 3600);
    cache.get('/valid');
    expect(cache.size()).toBe(1);
  });

  it('overwrites an existing key', () => {
    cache.set('/page', 'v1', 60);
    cache.set('/page', 'v2', 60);
    expect(cache.get('/page')).toBe('v2');
  });

  it('delete() removes a specific entry', () => {
    cache.set('/a', 'aaa', 60);
    cache.set('/b', 'bbb', 60);
    cache.delete('/a');
    expect(cache.get('/a')).toBeNull();
    expect(cache.get('/b')).toBe('bbb');
  });

  it('delete() on non-existent key does not throw', () => {
    expect(() => cache.delete('/does-not-exist')).not.toThrow();
  });

  it('clear() empties the entire cache', () => {
    cache.set('/a', 'a', 60);
    cache.set('/b', 'b', 60);
    cache.set('/c', 'c', 60);
    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.get('/a')).toBeNull();
  });

  it('size() returns the correct count before eviction', () => {
    cache.set('/x', 'x', 60);
    cache.set('/y', 'y', 60);
    expect(cache.size()).toBe(2);
  });

  it('size() decreases after delete()', () => {
    cache.set('/x', 'x', 60);
    cache.set('/y', 'y', 60);
    cache.delete('/x');
    expect(cache.size()).toBe(1);
  });

  it('supports complex cache keys with query strings', () => {
    const key = '/search{}{"q":"shoes","page":"2"}';
    cache.set(key, '<html>results</html>', 300);
    expect(cache.get(key)).toBe('<html>results</html>');
  });
});
