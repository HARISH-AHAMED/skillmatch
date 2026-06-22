import { User, Freelancer, Company, Project, Application, Recommendation, Review } from "@prisma/client";

export type ProjectWithCompany = Project & {
  company: Company & {
    user: Pick<User, "name" | "email" | "image">;
  };
};

export type FreelancerWithUser = Freelancer & {
  user: Pick<User, "name" | "email" | "image">;
};

export type ApplicationWithFreelancer = Application & {
  freelancer: FreelancerWithUser;
};

export type ApplicationWithProjectAndCompany = Application & {
  project: ProjectWithCompany;
};

export type ApplicationFull = Application & {
  project: ProjectWithCompany;
  freelancer: FreelancerWithUser;
};

export type RecommendationWithFreelancer = Recommendation & {
  freelancer: FreelancerWithUser;
};

export type RecommendationWithProject = Recommendation & {
  project: ProjectWithCompany;
};

export type ReviewWithAuthor = Review & {
  reviewer: Pick<User, "name" | "email" | "image" | "role">;
  project: Project;
};
