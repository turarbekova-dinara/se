import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from '@/App';
import { ROOMS } from '@/data/rooms';

// UI render check: renders the real <App /> to HTML in its default state (no extra test dependency needed).
describe('UI render check: <App /> default state', () => {
  const html = renderToString(createElement(App));

  it('renders the title and every room of the catalog', () => {
    expect(html).toContain('Room Availability Checker');
    for (const room of ROOMS) {
      expect(html).toContain(room.name);
    }
  });

  it('shows the green Available verdict for the default 11:00 request in Room 204', () => {
    expect(html).toContain('>Available<');
    expect(html).not.toContain('>Unavailable<');
  });

  it('does not show the empty state when rooms match', () => {
    expect(html).not.toContain('No rooms match your requirements');
  });
});
