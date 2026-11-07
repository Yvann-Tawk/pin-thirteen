import { registry } from '@pin-thirteen/registry';
import { describe, expect, it } from 'vitest';
import { LESSONS } from '../../../content/lessons/index';
import { articleFor, ARTICLES, explainPin, FINDING_ARTICLES, searchArticles } from './index';

describe('knowledge content', () => {
  it('has an article for every circuit part', () => {
    for (const d of registry.all()) expect(articleFor(d.id), d.id).toBeDefined();
  });
  it('links only to real lessons, parts and articles', () => {
    const ids = new Set(LESSONS.map((l) => l.id));
    for (const a of ARTICLES) {
      for (const l of a.lessons) expect(ids.has(l), `${a.id} -> ${l}`).toBe(true);
      if (a.part) expect(registry.get(a.part)).toBeDefined();
    }
    for (const id of Object.values(FINDING_ARTICLES)) expect(articleFor(id)).toBeDefined();
  });
  it('searches content', () => {
    expect(searchArticles('polarity').length + searchArticles('anode').length).toBeGreaterThan(0);
    expect(searchArticles('zzzz')).toEqual([]);
  });
  it('explains pins by role, not by name', () => {
    const uno = registry.get('uno-r3')!;
    expect(explainPin(uno.pins.find((p) => p.id === 'D9')!)).toContain('PWM');
    expect(explainPin(uno.pins.find((p) => p.id === 'GND_1')!)).toContain('return');
    expect(explainPin(uno.pins.find((p) => p.id === 'A0')!)).toContain('analogRead');
  });
});
