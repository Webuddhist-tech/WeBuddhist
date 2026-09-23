import { useTranslate } from "@tolgee/react";
import { FaUser } from "react-icons/fa6";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ContributorDTO, ContributorRole } from "@/services/library";

/**
 * English fallbacks, so a role still reads as a word before its translation
 * reaches the translation server.
 */
const ROLE_LABELS: Record<ContributorRole, string> = {
  translator: "Translator",
  reviser: "Reviser",
  author: "Author",
  scholar: "Scholar",
  narrator: "Narrator",
};

type ContributorListProps = {
  contributors: ContributorDTO[];
  /**
   * "horizontal" lays the credits out in a wrapping row, for the width of a
   * page; "vertical" stacks them, for a narrow column such as the reader's
   * resources panel.
   */
  layout?: "vertical" | "horizontal";
  className?: string;
};

const LAYOUTS = {
  vertical: "flex-col gap-4",
  horizontal: "flex-row flex-wrap gap-x-10 gap-y-4",
};

/**
 * Credits on a text: a name, the role they played, and a placeholder avatar -
 * the library stores names and roles, never portraits.
 *
 * Shared by the reader's resources panel and the text page, so a contributor
 * reads the same in both.
 */
const ContributorList = ({
  contributors,
  layout = "vertical",
  className = "",
}: ContributorListProps) => {
  const { t } = useTranslate();

  return (
    <ul className={`flex ${LAYOUTS[layout]} ${className}`}>
      {contributors.map((contributor, index) => (
        <li
          key={`${contributor.role}-${contributor.name}-${index}`}
          className="flex items-center gap-3"
        >
          <Avatar>
            <AvatarFallback className="bg-white text-gray-500">
              <FaUser className="size-3.5" aria-hidden="true" />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col text-left">
            <span className="overalltext text-sm text-gray-800">
              {contributor.name || t("contributor.ai", "AI")}
            </span>
            <span className="overalltext text-xs text-gray-500">
              {t(
                `contributor.role.${contributor.role}`,
                ROLE_LABELS[contributor.role] ?? contributor.role,
              )}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default ContributorList;
