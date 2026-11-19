import { describe, expect, it } from 'vitest';
import { blankLike, isColor, isLongText, isMediaPath, itemLabel, move } from './model';

describe('form model', () => {
  it('makes an empty item of the same shape', () => {
    expect(blankLike({ title: 'مجلس', count: 3, on: true, image: { src: 'a.jpg', type: null }, tags: ['x'] }))
      .toEqual({ title: '', count: 0, on: false, image: { src: '', type: null }, tags: [] });
    expect(blankLike(undefined)).toBe('');
  });

  it('names list items by their title, name or caption', () => {
    expect(itemLabel({ title: 'المجالس' }, 0)).toBe('المجالس');
    expect(itemLabel({ name: { ar: 'فيلا', en: 'Villa' } }, 0)).toBe('فيلا');
    expect(itemLabel({ src: 'a.jpg' }, 2)).toBe('العنصر 3');
    expect(itemLabel('x'.repeat(80), 0)).toHaveLength(58);
  });

  it('recognises media paths, colours and long texts', () => {
    expect(isMediaPath('images/projects/a.webp')).toBe(true);
    expect(isMediaPath('النظرة الساحرة')).toBe(false);
    expect(isColor('#7B5D08')).toBe(true);
    expect(isColor('7B5D08')).toBe(false);
    expect(isLongText('سطر\nسطر')).toBe(true);
  });

  it('moves items without touching the original list', () => {
    const list = ['a', 'b', 'c'];
    expect(move(list, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(move(list, 0, 5)).toEqual(list);
    expect(list).toEqual(['a', 'b', 'c']);
  });
});
