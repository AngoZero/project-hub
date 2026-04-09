import clsx from 'clsx';
import { useI18n } from '../app/i18n';
import { getStackBrandKey } from '../app/brandRegistry';
import { BrandMark } from './BrandMark';

interface TechnologyStackProps {
  stack: string[];
  size?: 'sm' | 'md';
  emptyLabel?: string;
  className?: string;
}

export function TechnologyStack({
  stack,
  size = 'md',
  emptyLabel,
  className,
}: TechnologyStackProps) {
  const { t } = useI18n();
  const computedEmptyLabel = emptyLabel ?? t('technologyUnclassified');

  if (stack.length === 0) {
    return <span className="muted-copy">{computedEmptyLabel}</span>;
  }

  return (
    <div className={clsx('technology-stack', `technology-stack--${size}`, className)}>
      {stack.map((item) => {
        const brandKey = getStackBrandKey(item);

        return (
          <span key={item} className="technology-pill">
            {brandKey ? (
              <span className="technology-pill__icon" aria-hidden="true">
                <BrandMark brand={brandKey} size={14} />
              </span>
            ) : null}
            <span className="technology-pill__label">{item}</span>
          </span>
        );
      })}
    </div>
  );
}
