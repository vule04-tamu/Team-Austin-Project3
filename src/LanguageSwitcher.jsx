import { useLanguage } from './LanguageSwitch';

export default function LanguageSwitcher({ layout = 'floating' }) {
  const { language, setLanguage, t } = useLanguage();

  if (layout === 'embedded') {
    return (
      <div className="kiosk-a11y-language">
        <label className="kiosk-a11y-section-label" htmlFor="kiosk-lang-select">
          {t("translate_label")}
        </label>
        <select
          id="kiosk-lang-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="kiosk-a11y-select"
        >
          <option value="english">{t("language_english")}</option>
          <option value="spanish">{t("language_spanish")}</option>
          <option value="chinese">{t("language_chinese")}</option>
        </select>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', top: 'auto', bottom: '16px', right: 'auto', left: '16px', zIndex: 1000 }}>
      <select 
        value={language} 
        onChange={(e) => setLanguage(e.target.value)}
        aria-label={t("translate_label")}
        style={{
          padding: '6px 10px',
          borderRadius: '6px',
          border: '1px solid var(--border)',
          background: 'var(--bg)',
          color: 'var(--text-h)',
          cursor: 'pointer',
          outline: 'none',
          fontFamily: 'inherit'
        }}
      >
        <option value="english">{t("language_english")}</option>
        <option value="spanish">{t("language_spanish")}</option>
        <option value="chinese">{t("language_chinese")}</option>
      </select>
    </div>
  );
}
