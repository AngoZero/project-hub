import clsx from 'clsx';
import type { CSSProperties } from 'react';
import { getBrandByKey, type BrandDefinition, type BrandKey } from '../app/brandRegistry';

interface BrandMarkProps {
  brand: BrandKey;
  size?: number;
  className?: string;
  title?: string;
}

function renderSvg(brand: BrandDefinition, size: number) {
  if (brand.kind === 'simple') {
    const style: CSSProperties =
      brand.mode === 'brand'
        ? { color: `#${brand.icon.hex}` }
        : {};

    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="brand-mark__svg"
        width={size}
        height={size}
        style={style}
      >
        <path d={brand.icon.path} fill="currentColor" />
      </svg>
    );
  }

  if (brand.kind === 'lucide') {
    const Icon = brand.icon;
    return <Icon aria-hidden="true" size={size} strokeWidth={2} />;
  }

  return <img src={brand.src} alt="" className="brand-mark__image" width={size} height={size} />;
}

export function BrandMark({ brand, size = 16, className, title }: BrandMarkProps) {
  const definition = getBrandByKey(brand);

  return (
    <span
      className={clsx('brand-mark', className, definition.mode === 'current' && 'brand-mark--current')}
      title={title ?? `${definition.label} mark`}
      aria-hidden="true"
      style={{ width: size, height: size }}
    >
      {renderSvg(definition, size)}
    </span>
  );
}
