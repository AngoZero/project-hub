import { FolderSearch, Sparkles } from 'lucide-react';
import { useI18n } from '../app/i18n';
import type { RootChildKind, RootFolderPreview } from '../app/types';
import { RootStructureReview } from './RootStructureReview';

interface OnboardingViewProps {
  isBusy: boolean;
  preview: RootFolderPreview | null;
  onPickRoot: () => Promise<void>;
  onConfirm: () => Promise<void>;
  onKindChange: (path: string, kind: RootChildKind) => void;
}

export function OnboardingView({ isBusy, preview, onPickRoot, onConfirm, onKindChange }: OnboardingViewProps) {
  const { t } = useI18n();

  return (
    <section className="onboarding-shell">
      <article className="surface-card onboarding-hero">
        <div className="onboarding-hero__copy">
          <p className="sidebar__eyebrow">{t('onboardingEyebrow')}</p>
          <h1>{t('onboardingTitle')}</h1>
          <p className="surface-card__description">{t('onboardingCopy')}</p>
        </div>
        <div className="onboarding-hero__badge">
          <Sparkles size={18} />
          <span>{t('onboardingReady')}</span>
        </div>
      </article>

      <div className="onboarding-grid">
        <article className="surface-card onboarding-step">
          <div className="surface-card__header">
            <div>
              <h3>{t('onboardingSelectTitle')}</h3>
              <p className="surface-card__description">{t('onboardingSelectCopy')}</p>
            </div>
          </div>

          <button type="button" className="button button--primary" onClick={() => void onPickRoot()} disabled={isBusy}>
            <FolderSearch size={16} />
            {preview ? t('onboardingChangeRoot') : t('onboardingPickRoot')}
          </button>

          {preview ? (
            <div className="onboarding-step__selection">
              <div>
                <span className="project-card__meta-label">{t('onboardingSelectedRoot')}</span>
                <p className="project-card__path">{preview.path}</p>
              </div>
              <div>
                <span className="project-card__meta-label">{t('onboardingSuggestedLabel')}</span>
                <p>{preview.suggestedLabel}</p>
              </div>
            </div>
          ) : null}
        </article>

        {preview ? (
          <RootStructureReview
            preview={preview}
            title={t('onboardingReviewTitle')}
            description={t('onboardingReviewCopy')}
            emptyCopy={t('rootsReviewEmpty')}
            onKindChange={onKindChange}
          />
        ) : null}
      </div>

      {preview ? (
        <div className="onboarding-actions">
          <button type="button" className="button button--primary" onClick={() => void onConfirm()} disabled={isBusy}>
            {t('onboardingConfirm')}
          </button>
        </div>
      ) : null}
    </section>
  );
}
