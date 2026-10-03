import { createRoot } from "react-dom/client";
import "./App.css";
import App from "./App.tsx";
import { BrowserRouter as Router } from "react-router-dom";
import { Auth0ProviderWithNavigate } from "./config/Auth0ProviderWithNavigate.tsx";
import { QueryClient, QueryClientProvider } from "react-query";
import { PechaAuthProvider } from "./config/AuthContext.tsx";
import {
  DevTools,
  FormatSimple,
  Tolgee,
  TolgeeProvider,
  type TolgeePlugin,
} from "@tolgee/react";
import localeEn from "./i18n/en.json";
import localeBoIn from "./i18n/bo-IN.json";
import { LANGUAGE } from "./utils/constants.ts";
import { HelmetProvider } from "react-helmet-async";
import { UserbackProvider } from "./context/UserBackProvider.tsx";
import { CollectionColorProvider } from "./context/CollectionColorContext.tsx";
import { LanguagesProvider } from "./context/LanguagesContext.tsx";
import { TransliterationProvider } from "./context/TransliterationContext.tsx";
import { Toaster } from "@/components/ui/sonner";
import AppOpenBanner from "./components/layout/AppOpenBanner.tsx";
import { initClarity } from "./utils/clarity.ts";

const queryClient = new QueryClient();
const defaultLanguage = import.meta.env.VITE_DEFAULT_LANGUAGE || "en";

initClarity();

if (!localStorage.getItem(LANGUAGE)) {
  localStorage.setItem(LANGUAGE, defaultLanguage);
}

const TOLGEE_CDN =
  "https://cdn.tolg.ee/50cc3287503c99e8f336aad9ee80f6f1/reactjs_json";
const LOCAL_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: localeEn,
  "bo-IN": localeBoIn,
};

/**
 * Translations from the Tolgee CDN, with any key it does not have yet taken
 * from the bundled JSON. Tolgee stays the source of truth for every key it
 * knows, but a key added alongside the code shows up straight away instead
 * of falling back to its English default until someone adds it in Tolgee.
 * If the CDN cannot be reached, `staticData` below takes over.
 */
const CdnWithLocalKeys = (): TolgeePlugin => (tolgee, tools) => {
  tools.addBackend({
    async getRecord({ language, namespace }) {
      if (namespace) return undefined;
      try {
        const response = await fetch(`${TOLGEE_CDN}/${language}.json`);
        if (!response.ok) return undefined;
        const remote = await response.json();
        return { ...LOCAL_TRANSLATIONS[language], ...remote };
      } catch {
        return undefined;
      }
    },
  });
  return tolgee;
};

const tolgee = Tolgee()
  .use(DevTools())
  .use(FormatSimple())
  // replace with .use(FormatIcu()) for rendering plurals, formatted numbers, etc.
  .use(CdnWithLocalKeys())
  .init({
    language: localStorage.getItem(LANGUAGE) || defaultLanguage,
    fallbackLanguage: "en",
    staticData: {
      en: async () => localeEn,
      "bo-IN": async () => localeBoIn,
    },
  });
createRoot(document.getElementById("root") as HTMLElement).render(
  <Router>
    <QueryClientProvider client={queryClient}>
      <TolgeeProvider tolgee={tolgee}>
        <Auth0ProviderWithNavigate>
          <PechaAuthProvider>
            <HelmetProvider>
              <UserbackProvider>
                <CollectionColorProvider>
                  <LanguagesProvider>
                    <TransliterationProvider>
                      <>
                        <App />
                        <Toaster />
                        {window?.location?.pathname === "/" && (
                          <AppOpenBanner />
                        )}
                      </>
                    </TransliterationProvider>
                  </LanguagesProvider>
                </CollectionColorProvider>
              </UserbackProvider>
            </HelmetProvider>
          </PechaAuthProvider>
        </Auth0ProviderWithNavigate>
      </TolgeeProvider>
    </QueryClientProvider>
  </Router>,
);
