import type * as React from 'react';

type RuonBadgeAttributes = {
  ref?: string | any;
  theme?: 'auto' | 'dark' | 'light' | 'monochrome';
  size?: 'sm' | 'md';
  label?: string;
  'show-symbol'?: boolean;
  'utm-source'?: string;
  'utm-medium'?: string;
  'utm-campaign'?: string;
  'base-url'?: string;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'ruon-badge': Omit<React.HTMLAttributes<HTMLElement>, 'ref'> & RuonBadgeAttributes;
    }
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'ruon-badge': Omit<React.HTMLAttributes<HTMLElement>, 'ref'> & RuonBadgeAttributes;
    }
  }
}
