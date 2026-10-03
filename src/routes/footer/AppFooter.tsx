import { Link } from "react-router-dom";
import { useTranslate } from "@tolgee/react";
import { columns } from "./Footer.tsx";

const LINK_CLASS =
  "overalltext text-sm text-faded-grey transition-colors hover:text-primary";

/**
 * The footer of the sidebar shell: a single quiet row of links under a rule.
 * Brand, socials and the long description already live elsewhere in the
 * shell, so all this keeps is somewhere to find the less-used pages.
 */
const AppFooter = () => {
  const { t } = useTranslate();
  return (
    <footer className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      <nav
        aria-label={t("footer.label", "Footer")}
        className="flex flex-wrap gap-x-6 gap-y-2 border-t border-custom-border py-6"
      >
        {columns.flatMap(({ links }) =>
          links.map(({ href, labelKey, i18nKey }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_CLASS}
            >
              {i18nKey ? t(i18nKey, labelKey) : labelKey}
            </a>
          )),
        )}
        <Link to="/privacy-policy" className={LINK_CLASS}>
          {t("footer.privacy_policy", "Privacy Policy")}
        </Link>
        <Link to="/terms-of-service" className={LINK_CLASS}>
          {t("footer.terms_of_service", "Terms of Service")}
        </Link>
      </nav>
    </footer>
  );
};

export default AppFooter;
