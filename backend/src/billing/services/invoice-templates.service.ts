import { Injectable } from '@nestjs/common';

export interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  layout: 'classic' | 'modern' | 'minimal' | 'professional' | 'bold' | 'gradient' | 'elegant' | 'compact' | 'detailed' | 'colorful' | 'monochrome' | 'corporate' | 'simple' | 'fancy' | 'traditional';
  accentColor: string;
  headerStyle: 'filled' | 'bordered' | 'gradient' | 'underline' | 'minimal';
  tableStyle: 'striped' | 'bordered' | 'minimal' | 'modern' | 'alternate';
  font: 'arial' | 'georgia' | 'roboto' | 'fira';
  isActive: boolean;
}

export const INVOICE_TEMPLATES: InvoiceTemplate[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional professional invoice with navy blue header',
    layout: 'classic',
    accentColor: '#1a237e',
    headerStyle: 'filled',
    tableStyle: 'bordered',
    font: 'arial',
    isActive: true,
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean minimal design with subtle shadows',
    layout: 'modern',
    accentColor: '#0d47a1',
    headerStyle: 'gradient',
    tableStyle: 'modern',
    font: 'roboto',
    isActive: false,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Simple clean lines, lots of white space',
    layout: 'minimal',
    accentColor: '#424242',
    headerStyle: 'underline',
    tableStyle: 'minimal',
    font: 'arial',
    isActive: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Corporate look with balanced layout',
    layout: 'professional',
    accentColor: '#2e7d32',
    headerStyle: 'filled',
    tableStyle: 'striped',
    font: 'georgia',
    isActive: false,
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'Strong visual impact with contrasting colors',
    layout: 'bold',
    accentColor: '#c62828',
    headerStyle: 'filled',
    tableStyle: 'bordered',
    font: 'arial',
    isActive: false,
  },
  {
    id: 'gradient',
    name: 'Gradient',
    description: 'Beautiful gradient header, modern feel',
    layout: 'gradient',
    accentColor: '#0277bd',
    headerStyle: 'gradient',
    tableStyle: 'modern',
    font: 'roboto',
    isActive: false,
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Refined typography with gold accents',
    layout: 'elegant',
    accentColor: '#bf360c',
    headerStyle: 'bordered',
    tableStyle: 'striped',
    font: 'georgia',
    isActive: false,
  },
  {
    id: 'compact',
    name: 'Compact',
    description: 'Space-efficient, fits more data per page',
    layout: 'compact',
    accentColor: '#37474f',
    headerStyle: 'minimal',
    tableStyle: 'minimal',
    font: 'arial',
    isActive: false,
  },
  {
    id: 'detailed',
    name: 'Detailed',
    description: 'Extended format with full tax breakdowns',
    layout: 'detailed',
    accentColor: '#4a148c',
    headerStyle: 'filled',
    tableStyle: 'bordered',
    font: 'arial',
    isActive: false,
  },
  {
    id: 'colorful',
    name: 'Colorful',
    description: 'Vibrant and eye-catching design',
    layout: 'colorful',
    accentColor: '#e65100',
    headerStyle: 'gradient',
    tableStyle: 'alternate',
    font: 'roboto',
    isActive: false,
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    description: 'Black and white, printer-friendly',
    layout: 'monochrome',
    accentColor: '#212121',
    headerStyle: 'bordered',
    tableStyle: 'bordered',
    font: 'arial',
    isActive: false,
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Standard business invoice format',
    layout: 'corporate',
    accentColor: '#1565c0',
    headerStyle: 'filled',
    tableStyle: 'striped',
    font: 'georgia',
    isActive: false,
  },
  {
    id: 'simple',
    name: 'Simple',
    description: 'Bare essentials, clean and easy to read',
    layout: 'simple',
    accentColor: '#546e7a',
    headerStyle: 'underline',
    tableStyle: 'minimal',
    font: 'arial',
    isActive: false,
  },
  {
    id: 'fancy',
    name: 'Fancy',
    description: 'Decorative elements for a premium feel',
    layout: 'fancy',
    accentColor: '#6a1b9a',
    headerStyle: 'gradient',
    tableStyle: 'alternate',
    font: 'georgia',
    isActive: false,
  },
  {
    id: 'traditional',
    name: 'Traditional',
    description: 'Classic Indian invoice style',
    layout: 'traditional',
    accentColor: '#004d40',
    headerStyle: 'filled',
    tableStyle: 'bordered',
    font: 'arial',
    isActive: false,
  },
];

@Injectable()
export class InvoiceTemplatesService {
  getTemplates(): InvoiceTemplate[] {
    return INVOICE_TEMPLATES;
  }

  getTemplate(templateId: string): InvoiceTemplate {
    const template = INVOICE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      return INVOICE_TEMPLATES.find((t) => t.id === 'classic')!;
    }
    return template;
  }

  getActiveTemplate(settings: any): InvoiceTemplate {
    const activeId = settings?.activeTemplate || 'classic';
    return this.getTemplate(activeId);
  }
}
