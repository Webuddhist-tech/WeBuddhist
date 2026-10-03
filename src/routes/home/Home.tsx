import { useCallback, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useTolgee } from "@tolgee/react";
import Seo from "../commons/seo/Seo.tsx";
import DownloadAppModal from "../../components/DownloadAppModal.tsx";
import { LANGUAGE, siteDescription, siteName } from "../../utils/constants.ts";
import {
  apiLanguageParam,
  tolgeeToPlanLanguage,
} from "../planviewer/utils/seriesUtils.ts";
import {
  isMobileDevice,
  openAppDownloadPage,
} from "../../utils/deviceUtils.ts";
import HeroSection from "./sections/HeroSection.tsx";
import QuickStartCards from "./sections/QuickStartCards.tsx";
import LibraryBand from "./sections/LibraryBand.tsx";
import LiveSection from "./sections/LiveSection.tsx";
import PlansSection from "./sections/PlansSection.tsx";
import GroupsSection from "./sections/GroupsSection.tsx";
import FeatureCards from "./sections/FeatureCards.tsx";
import AppSection from "./sections/AppSection.tsx";

/** Query keys the practice area reads; "/" used to serve these views itself. */
const PRACTICE_PARAMS = ["series", "plan", "group", "accumulator", "view"];

/**
 * The front page, laid out as a stack of panels: a headline, two ways in
 * (read, or today's verse), the library's shelves, then what is live, a few
 * plans and groups, and the app.
 *
 * Every panel is filled from the same queries the full listings use, so
 * following "See all" lands on a page that is already loaded. A panel with
 * nothing to show leaves itself out.
 */
const Home = () => {
  const tolgee = useTolgee(["language"]);
  const [searchParams] = useSearchParams();
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);

  const storedLanguage =
    tolgee.getLanguage() || localStorage.getItem(LANGUAGE) || "en";
  const apiLanguage = apiLanguageParam(storedLanguage);
  const planLanguage = tolgeeToPlanLanguage(storedLanguage);

  const handleOpenApp = useCallback(() => {
    if (isMobileDevice()) {
      openAppDownloadPage();
      return;
    }
    setDownloadModalOpen(true);
  }, []);

  // Links made before the practice area moved off "/" still work.
  const hasPracticeParams = PRACTICE_PARAMS.some((key) =>
    searchParams.get(key),
  );
  if (hasPracticeParams) {
    return <Navigate to={`/plans?${searchParams.toString()}`} replace />;
  }

  return (
    <div className="overalltext mx-auto w-full max-w-6xl space-y-4 px-4 pb-10 sm:px-6 lg:px-8">
      <Seo
        title={siteName}
        description={siteDescription}
        canonical={`${window.location.origin}/`}
      />
      <HeroSection apiLanguage={apiLanguage} />
      <QuickStartCards apiLanguage={apiLanguage} />
      <LibraryBand />
      <LiveSection apiLanguage={apiLanguage} locale={storedLanguage} />
      <PlansSection apiLanguage={apiLanguage} planLanguage={planLanguage} />
      <GroupsSection apiLanguage={apiLanguage} planLanguage={planLanguage} />
      <FeatureCards
        apiLanguage={apiLanguage}
        planLanguage={planLanguage}
        onOpenApp={handleOpenApp}
      />
      <AppSection />
      <DownloadAppModal
        open={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
      />
    </div>
  );
};

export default Home;
