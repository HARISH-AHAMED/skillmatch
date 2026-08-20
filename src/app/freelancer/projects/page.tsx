import { requireFreelancer } from "@/data/server/context";
import { browseProjects, savedProjectIds } from "@/data/server/entities";
import { ProjectsClient } from "./ProjectsClient";

export default async function FreelancerProjectsPage() {
  const { freelancer } = await requireFreelancer("/freelancer/projects");

  const [projects, saved] = await Promise.all([
    // Scored against this freelancer so "Best match" is the real ranking.
    browseProjects({ sort: "MATCH" }, freelancer.id),
    savedProjectIds(freelancer.id),
  ]);

  return <ProjectsClient projects={projects} freelancerId={freelancer.id} savedIds={saved} />;
}
