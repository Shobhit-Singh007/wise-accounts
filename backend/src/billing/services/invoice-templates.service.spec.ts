import { InvoiceTemplatesService, INVOICE_TEMPLATES } from './invoice-templates.service';

describe('InvoiceTemplatesService', () => {
  let service: InvoiceTemplatesService;

  beforeEach(() => {
    service = new InvoiceTemplatesService();
  });

  describe('getTemplates', () => {
    it('should return all templates', () => {
      const result = service.getTemplates();
      expect(result.length).toBe(15);
      expect(result).toEqual(INVOICE_TEMPLATES);
    });

    it('should have all required fields', () => {
      const result = service.getTemplates();
      for (const template of result) {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.layout).toBeDefined();
        expect(template.accentColor).toBeDefined();
        expect(template.headerStyle).toBeDefined();
        expect(template.tableStyle).toBeDefined();
        expect(template.font).toBeDefined();
        expect(typeof template.isActive).toBe('boolean');
      }
    });

    it('should have unique IDs', () => {
      const result = service.getTemplates();
      const ids = result.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('getTemplate', () => {
    it('should return classic template by default', () => {
      const result = service.getTemplate('classic');
      expect(result.id).toBe('classic');
      expect(result.name).toBe('Classic');
    });

    it('should return requested template', () => {
      const result = service.getTemplate('modern');
      expect(result.id).toBe('modern');
      expect(result.name).toBe('Modern');
    });

    it('should return classic template for unknown ID', () => {
      const result = service.getTemplate('nonexistent');
      expect(result.id).toBe('classic');
    });

    it('should return all layout types', () => {
      const layouts = ['classic', 'modern', 'minimal', 'professional', 'bold', 'gradient', 'elegant', 'compact', 'detailed', 'colorful', 'monochrome', 'corporate', 'simple', 'fancy', 'traditional'];
      for (const layout of layouts) {
        const result = service.getTemplate(layout);
        expect(result.layout).toBe(layout);
      }
    });
  });

  describe('getActiveTemplate', () => {
    it('should return template from settings', () => {
      const result = service.getActiveTemplate({ activeTemplate: 'modern' });
      expect(result.id).toBe('modern');
    });

    it('should return classic when no settings', () => {
      const result = service.getActiveTemplate(null);
      expect(result.id).toBe('classic');
    });

    it('should return classic when settings have no activeTemplate', () => {
      const result = service.getActiveTemplate({});
      expect(result.id).toBe('classic');
    });

    it('should fallback to classic for unknown template in settings', () => {
      const result = service.getActiveTemplate({ activeTemplate: 'unknown' });
      expect(result.id).toBe('classic');
    });
  });
});
