import { db } from "@/lib/db";
import { Project, Freelancer, ProjectPriority } from "@prisma/client";

export interface SkillMatchInput {
  freelancerSkills: string[];
  projectSkills: string[];
}

export function calculateSkillMatch(skills: SkillMatchInput): number {
  if (skills.projectSkills.length === 0) return 100;
  const projectSet = new Set(skills.projectSkills.map(s => s.toLowerCase().trim()));
  const freelancerSet = new Set(skills.freelancerSkills.map(s => s.toLowerCase().trim()));
  
  let matches = 0;
  projectSet.forEach(skill => {
    if (freelancerSet.has(skill)) {
      matches++;
    }
  });

  return (matches / projectSet.size) * 100;
}

export function calculateExperienceMatch(freelancerYears: number, requiredYears: number): number {
  if (requiredYears <= 0) return 100;
  if (freelancerYears >= requiredYears) return 100;
  return (freelancerYears / requiredYears) * 100;
}

export function calculatePriorityMatch(priority: ProjectPriority, rating: number, completionRate: number): number {
  if (priority === ProjectPriority.HIGH) {
    // High priority project requires top freelancers: rating >= 4.3 and completionRate >= 92%
    if (rating >= 4.3 && completionRate >= 92) {
      return 100;
    }
    return 70;
  }
  if (priority === ProjectPriority.MEDIUM) {
    return 90;
  }
  // Low priority
  return 80;
}

export function computeRecommendationScore(freelancer: Freelancer, project: Project): number {
  const skillMatch = calculateSkillMatch({
    freelancerSkills: freelancer.skills,
    projectSkills: project.requiredSkills,
  });

  const experienceMatch = calculateExperienceMatch(
    freelancer.experienceYears,
    project.experienceRequired
  );

  const ratingMatch = (freelancer.rating / 5.0) * 100;
  const completionRateMatch = freelancer.completionRate;
  
  const priorityMatch = calculatePriorityMatch(
    project.priority,
    freelancer.rating,
    freelancer.completionRate
  );

  // Formula:
  // finalScore = (skillMatch * 0.50) + (experienceMatch * 0.20) + (ratingMatch * 0.15) + (completionRateMatch * 0.10) + (priorityMatch * 0.05)
  const finalScore =
    skillMatch * 0.50 +
    experienceMatch * 0.20 +
    ratingMatch * 0.15 +
    completionRateMatch * 0.10 +
    priorityMatch * 0.05;

  return Math.round(finalScore * 10) / 10; // Round to 1 decimal place
}

/**
 * Recalculates and caches the top 10 recommended freelancers for a project.
 */
export async function recalculateRecommendationsForProject(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
  });

  if (!project || project.status !== "OPEN") return;

  const freelancers = await db.freelancer.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  const scoredFreelancers = freelancers.map(freelancer => {
    const score = computeRecommendationScore(freelancer, project);
    return {
      freelancerId: freelancer.id,
      score,
    };
  });

  // Sort descending and take top 10
  scoredFreelancers.sort((a, b) => b.score - a.score);
  const topRecommendations = scoredFreelancers.slice(0, 10);

  // Update DB cache
  await db.$transaction([
    db.recommendation.deleteMany({
      where: { projectId },
    }),
    db.recommendation.createMany({
      data: topRecommendations.map(rec => ({
        projectId,
        freelancerId: rec.freelancerId,
        score: rec.score,
      })),
    }),
  ]);
}

/**
 * Recalculates recommendations for all active projects when a freelancer profile updates.
 */
export async function recalculateRecommendationsForFreelancer(freelancerId: string) {
  const freelancer = await db.freelancer.findUnique({
    where: { id: freelancerId },
  });

  if (!freelancer) return;

  const openProjects = await db.project.findMany({
    where: { status: "OPEN" },
  });

  for (const project of openProjects) {
    const score = computeRecommendationScore(freelancer, project);

    // See if freelancer is currently in the top 10 or needs updating
    // For simplicity, we recalculate recommendations for the project to keep the cache clean
    await recalculateRecommendationsForProject(project.id);
  }
}
