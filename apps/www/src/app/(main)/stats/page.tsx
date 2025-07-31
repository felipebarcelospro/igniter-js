import {
  BackButton,
  PageDescription,
  PageHeader,
  Page as PageLayout,
  PageTitle,
} from "@/components/ui/page";
import { githubService } from "@/lib/github";
import { Metadata } from "next";
import { ChangelogList } from "./components/changelog-list";
import { ContributorRanking } from "./components/contributor-ranking";
import { RepoStats } from "./components/repo-stats";

export const metadata: Metadata = {
  title: "Changelog | Drift KV",
  description:
    "View the latest updates, improvements, and contributor information for the Drift KV.",
};

export default async function Page() {
  const releases = await githubService.getRepositoryReleases();
  const contributors = await githubService.getRepositoryContributors();
  const repoInfo = await githubService.getRepositoryInfo();

  return (
    <PageLayout className="container max-w-screen-md">
      <PageHeader>
        <BackButton />
        <PageTitle>Changelog & Project Info</PageTitle>
        <PageDescription>
          View the latest updates, improvements, and contributor information for
          the Drift KV.
        </PageDescription>
      </PageHeader>

      <section className="space-y-12">
        <RepoStats repoInfo={repoInfo} />
        <ContributorRanking contributors={contributors.slice(0, 5)} />
        <ChangelogList releases={releases} />
      </section>
    </PageLayout>
  );
}
