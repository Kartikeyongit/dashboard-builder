import { describe, expect, it } from 'vitest';
import {
  DASHBOARD_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
  getDashboardTemplate,
  templatePayload,
} from './dashboardTemplates';

const validFilterId = (id: string) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(id);

describe('dashboard templates', () => {
  it('exposes a blank template as the default', () => {
    expect(getDashboardTemplate(DEFAULT_TEMPLATE_ID).id).toBe('blank');
    expect(getDashboardTemplate('missing').id).toBe('blank');
  });

  it('uses valid, unique filter ids', () => {
    for (const template of DASHBOARD_TEMPLATES) {
      const ids = (template.build().filters ?? []).map((filter) => filter.id);
      expect(new Set(ids).size).toBe(ids.length);
      ids.forEach((id) => expect(validFilterId(id)).toBe(true));
    }
  });

  it('keeps refresh intervals within the backend limit', () => {
    for (const template of DASHBOARD_TEMPLATES) {
      const refresh = template.build().refresh_interval_seconds ?? 0;
      expect(refresh).toBeGreaterThanOrEqual(0);
      expect(refresh).toBeLessThanOrEqual(86400);
    }
  });

  it('gives select filters at least one option and a known default', () => {
    for (const template of DASHBOARD_TEMPLATES) {
      for (const filter of template.build().filters ?? []) {
        if (filter.type !== 'select') continue;
        expect(filter.options?.length ?? 0).toBeGreaterThan(0);
        if (filter.default) expect(filter.options).toContain(filter.default);
      }
    }
  });

  it('prefers the typed name, then the template name, then a fallback', () => {
    expect(templatePayload('weekly-review', '  My review  ').name).toBe('My review');
    expect(templatePayload('weekly-review', '   ').name).toBe('Weekly review');
    expect(templatePayload('blank', '').name).toBe('Untitled dashboard');
  });
});
