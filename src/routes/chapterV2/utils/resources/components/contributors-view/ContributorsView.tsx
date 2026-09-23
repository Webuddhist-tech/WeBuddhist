import { useQuery } from "react-query";
import { useTolgee, useTranslate } from "@tolgee/react";
import { getTextContributors } from "@/services/library";
import { mapLanguageCode } from "../../../../../../utils/helperFunctions.tsx";
import ContributorList from "../../../../../commons/contributors/ContributorList.tsx";
import ResourceHeader from "../common/ResourceHeader.tsx";
import ResourceState from "../common/ResourceState.tsx";

/**
 * Credits on the text the selected segment belongs to.
 *
 * Shared by the panel's menu, which needs the count to decide whether to offer
 * the view at all, and the view itself - one react-query key, so the second
 * caller is a cache hit.
 */
export const useTextContributors = (textId?: string | null) => {
  const tolgee = useTolgee(["language"]);
  const language = mapLanguageCode(tolgee.getLanguage() || "en");

  return useQuery(
    ["text-contributors", textId, language],
    () => getTextContributors({ textId: textId as string, language }),
    { enabled: Boolean(textId), refetchOnWindowFocus: false, retry: false },
  );
};

type ContributorsViewProps = {
  textId?: string | null;
  handleNavigate: () => void;
  onClose: () => void;
};

/** Who the text a selected segment belongs to is credited to. */
const ContributorsView = ({
  textId,
  handleNavigate,
  onClose,
}: ContributorsViewProps) => {
  const { t } = useTranslate();
  const { data, isLoading, error } = useTextContributors(textId);

  const contributors = data ?? [];

  return (
    <div className="flex h-full flex-col">
      <ResourceHeader
        title={`${t("panel.contributors", "Contributors")}${
          contributors.length ? ` (${contributors.length})` : ""
        }`}
        onBack={handleNavigate}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto p-4 text-left text-black">
        <ResourceState
          isLoading={isLoading}
          isError={error}
          isEmpty={contributors.length === 0}
        >
          <ContributorList contributors={contributors} />
        </ResourceState>
      </div>
    </div>
  );
};

export default ContributorsView;
