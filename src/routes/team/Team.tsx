import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { cn } from "@/lib/utils";
import teamData from "./team.json";

type TeamMember = {
  name: string;
  role: string;
  image?: string;
};

type TeamGroup = {
  name: string;
  members: TeamMember[];
};

type TeamData = {
  title: string;
  description: string;
  groups: TeamGroup[];
};

const { title, description, groups } = teamData as TeamData;

const GROUP_BARS = ["#802F3E", "#102544", "#18345d", "#0f479a"];

const groupSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((part) => /^[a-z]/i.test(part))
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

const MemberAvatar = ({ member }: { member: TeamMember }) => {
  const [failed, setFailed] = useState(false);

  if (!member.image || failed) {
    return (
      <div
        className="overalltext flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-navbar text-sm font-semibold text-primary sm:h-16 sm:w-16"
        aria-hidden="true"
      >
        {initials(member.name)}
      </div>
    );
  }

  return (
    <img
      src={member.image}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-14 w-14 shrink-0 rounded-full bg-navbar object-cover sm:h-16 sm:w-16"
    />
  );
};

const MemberCard = ({ member }: { member: TeamMember }) => (
  <li className="flex items-center gap-4 rounded-xl border border-custom-border bg-white p-4">
    <MemberAvatar member={member} />
    <div className="min-w-0">
      <p className="overalltext font-medium leading-snug text-foreground">
        {member.name}
      </p>
      <p className="overalltext mt-1 text-sm leading-snug text-muted-foreground">
        {member.role}
      </p>
    </div>
  </li>
);

const Team = () => (
  <>
    <Helmet>
      <title>Team — WeBuddhist</title>
      <meta name="description" content={description} />
    </Helmet>

    <div className="min-h-screen bg-white">
      <header className="border-b border-custom-border bg-navbar">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <h1 className="en-serif-text text-3xl font-medium leading-tight text-foreground sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p className="overalltext mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {description}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {groups.map((group, index) => {
          const headingId = groupSlug(group.name);

          return (
            <section
              key={group.name}
              aria-labelledby={headingId}
              className={cn(
                "py-12 sm:py-14",
                index > 0 && "border-t border-custom-border",
              )}
            >
              <div className="mb-8 space-y-3">
                <div
                  className="h-1 w-16 rounded-full"
                  style={{
                    backgroundColor: GROUP_BARS[index % GROUP_BARS.length],
                  }}
                  aria-hidden="true"
                />
                <h2
                  id={headingId}
                  className="en-serif-text text-2xl font-medium text-foreground sm:text-3xl"
                >
                  {group.name}
                </h2>
              </div>

              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.members.map((member) => (
                  <MemberCard key={member.name} member={member} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  </>
);

export default Team;
