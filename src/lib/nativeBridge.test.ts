import { describe, it, expect, vi } from 'vitest';
import {
  callNative,
  hasNativeMethod,
  invokeNative,
} from './nativeBridge';

describe('nativeBridge', () => {
  it('callNative restituisce undefined se il bridge è assente', () => {
    expect(callNative(undefined, 'setSystemBarsDark', true)).toBeUndefined();
    expect(callNative(null, 'setSystemBarsDark', true)).toBeUndefined();
  });

  it('callNative restituisce undefined se il metodo non esiste', () => {
    const bridge = { altro: () => 1 };
    expect(callNative(bridge, 'metodoMancante')).toBeUndefined();
    expect(invokeNative(bridge, 'metodoMancante').ok).toBe(false);
  });

  it('callNative non lancia se il metodo nativo lancia', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bridge = {
      setSystemBarsDark: () => {
        throw new Error('Java exception was raised during method invocation');
      },
    };
    expect(() => callNative(bridge, 'setSystemBarsDark', true)).not.toThrow();
    expect(callNative(bridge, 'setSystemBarsDark', true)).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('callNative restituisce il valore di ritorno corretto', () => {
    const bridge = {
      getSystemIsDark: () => true,
      exportTextFile: (_n: string, _c: string) => true,
    };
    expect(callNative<boolean>(bridge, 'getSystemIsDark')).toBe(true);
    expect(callNative<boolean>(bridge, 'exportTextFile', 'a.json', '{}')).toBe(
      true
    );
    expect(callNative<boolean>(bridge, 'metodoAssente')).toBeUndefined();
  });

  it('passa gli argomenti al metodo nativo', () => {
    const fn = vi.fn(() => 'ok');
    const bridge = { setOrientation: fn };
    expect(callNative<string>(bridge, 'setOrientation', 'landscape')).toBe(
      'ok'
    );
    expect(fn).toHaveBeenCalledWith('landscape');
  });

  it('invokeNative distingue metodo mancante da errore', () => {
    const bridge = {};
    expect(invokeNative(bridge, 'x').ok).toBe(false);
    const throwing = {
      x: () => {
        throw new Error('boom');
      },
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(invokeNative(throwing, 'x').ok).toBe(false);
    warn.mockRestore();
  });

  it('hasNativeMethod riconosce solo funzioni', () => {
    expect(hasNativeMethod({ f: () => {} }, 'f')).toBe(true);
    expect(hasNativeMethod({ f: 42 }, 'f')).toBe(false);
    expect(hasNativeMethod(undefined, 'f')).toBe(false);
  });
});
