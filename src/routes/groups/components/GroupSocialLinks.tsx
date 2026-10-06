import type { IconType } from "react-icons";
import {
  FaFacebook,
  FaGlobe,
  FaInstagram,
  FaLink,
  FaLinkedin,
  FaTelegram,
  FaTiktok,
  FaWeixin,
  FaWhatsapp,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import { safeExternalUrl } from "../../live-events/utils/eventUtils.ts";
import type { GroupSocialLinkDTO } from "../types.ts";

const ICONS: Record<string, IconType> = {
  youtube: FaYoutube,
  facebook: FaFacebook,
  instagram: FaInstagram,
  x: FaXTwitter,
  twitter: FaXTwitter,
  tiktok: FaTiktok,
  linkedin: FaLinkedin,
  telegram: FaTelegram,
  whatsapp: FaWhatsapp,
  wechat: FaWeixin,
  weixin: FaWeixin,
  website: FaGlobe,
  web: FaGlobe,
};

const platformLabel = (platform: string) =>
  platform.charAt(0).toUpperCase() + platform.slice(1);

/**
 * The group's own channels, as icons. Platform names are free text from
 * Studio, so an unknown one gets a plain link icon rather than nothing, and
 * a URL that is not plain http(s) is not offered at all.
 */
const GroupSocialLinks = ({ links }: { links: GroupSocialLinkDTO[] }) => {
  const safe = links.flatMap((link) => {
    const href = safeExternalUrl(link.url);
    return href ? [{ ...link, href }] : [];
  });
  if (safe.length === 0) return null;

  return (
    <ul className="flex flex-wrap items-center gap-2">
      {safe.map((link) => {
        const platform = link.platform.trim().toLowerCase();
        const Icon = ICONS[platform] ?? FaLink;
        const label = platformLabel(link.platform.trim()) || link.href;
        return (
          <li key={link.id}>
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={label}
              title={label}
              className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-[#102544] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#102544]/50"
            >
              <Icon className="size-4" aria-hidden />
            </a>
          </li>
        );
      })}
    </ul>
  );
};

export default GroupSocialLinks;
