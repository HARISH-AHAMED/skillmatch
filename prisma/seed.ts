import { PrismaClient, Role, ProjectPriority, ProjectStatus, ApplicationStatus } from "@prisma/client";
import { computeRecommendationScore } from "../src/services/aiRecommendation";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Safety check: skip seeding if users already exist to prevent overwriting custom profile data
  const userCount = await prisma.user.count().catch(() => 0);
  if (userCount > 0) {
    console.log("Database already contains data. Skipping seeding to preserve your profile modifications.");
    return;
  }

  // 1. Clear existing data
  await prisma.adminLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.task.deleteMany();
  await prisma.message.deleteMany();
  await prisma.sharedFile.deleteMany();
  await prisma.projectUpdate.deleteMany();
  await prisma.application.deleteMany();
  await prisma.project.deleteMany();
  await prisma.company.deleteMany();
  await prisma.freelancer.deleteMany();
  await prisma.user.deleteMany();

  console.log("Cleaned up old records.");

  // 2. Create Admin
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@skillmatch.ai",
      name: "Alex Rivera",
      role: Role.ADMIN,
      passwordHash: "admin123",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
    },
  });

  await prisma.adminLog.create({
    data: {
      adminId: adminUser.id,
      action: "Initialized system seed data.",
    },
  });

  // 3. Create Companies
  const companyData = [
    {
      email: "company.quantum@skillmatch.ai",
      name: "Sarah Chen",
      companyName: "Quantum Labs AI",
      description: "Next-gen deep learning and AI assistant systems.",
      industry: "Artificial Intelligence",
      website: "https://quantumlabs.ai",
      location: "San Francisco, CA",
      logoUrl: "https://api.dicebear.com/7.x/initials/svg?seed=QuantumLabs",
      companySize: "250 Employees",
      foundedYear: 2020,
      linkedin: "https://linkedin.com/company/quantum-labs-ai",
      phone: "+1 (555) 123-4567",
      missionVision: "We build AI-powered solutions that help businesses hire and manage talent efficiently.",
      workCulture: "Fast-paced, autonomy-driven, and highly collaborative with a focus on engineering excellence and AI-first principles.",
      hiringPhilosophy: "We hire self-driven builders who love taking ownership and solving complex algorithmic challenges.",
      galleryPhotos: [
        "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600",
        "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600",
        "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600"
      ],
      galleryVideos: [
        "https://www.w3schools.com/html/mov_bbb.mp4"
      ],
      benefits: [
        "Flexible Working Hours",
        "Remote Friendly",
        "Fast Payments",
        "Long-Term Opportunities",
        "Learning Budget"
      ],
      teamMembers: [
        { name: "Sarah Chen", role: "Hiring Manager", photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" },
        { name: "Emily Watson", role: "HR Manager", photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily" },
        { name: "Michael Chang", role: "Project Manager", photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael" }
      ],
      verificationBadges: [
        "Identity Verified",
        "Business Verified",
        "Website Verified",
        "Payment Verified",
        "Trusted Employer",
        "Top Hiring Company"
      ],
      trustScore: 96,
      reputationScore: 94,
      sentimentAnalysis: "Extremely positive. Freelancers praise clear communications, on-time milestones, and high technical quality.",
      completionRate: 98.0,
      retentionRate: 92.0,
      paymentReliability: 100.0,
      avgResponseTime: "Within 1 hour",
      avgTimeToHire: "10 days",
      hiringSuccessRate: 94.0
    },
    {
      email: "company.stripe@skillmatch.ai",
      name: "Marcus Aurelius",
      companyName: "Stripe Flow Inc",
      description: "Financial transactions infrastructure and payment APIs.",
      industry: "Fintech",
      website: "https://stripeflow.io",
      location: "Austin, TX",
      logoUrl: "https://api.dicebear.com/7.x/initials/svg?seed=StripeFlow",
      companySize: "1,200 Employees",
      foundedYear: 2015,
      linkedin: "https://linkedin.com/company/stripe-flow",
      phone: "+1 (555) 987-6543",
      missionVision: "Our mission is to increase the GDP of the internet by providing modular, secure financial integration frameworks.",
      workCulture: "Obsess over developers, design with extreme precision, value high-agency individuals who love simplicity.",
      hiringPhilosophy: "We look for craftspeople who take pride in writing elegant code, robust documentation, and developer-friendly UX.",
      galleryPhotos: [
        "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600",
        "https://images.unsplash.com/photo-1542744094-3a31f103e35f?w=600"
      ],
      galleryVideos: [],
      benefits: [
        "Flexible Working Hours",
        "Remote Friendly",
        "Fast Payments",
        "Learning Budget",
        "Health & Wellness Subsidy"
      ],
      teamMembers: [
        { name: "Marcus Aurelius", role: "Hiring Manager", photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus" },
        { name: "Sophia Reynolds", role: "Recruiter", photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia" }
      ],
      verificationBadges: [
        "Identity Verified",
        "Business Verified",
        "Website Verified",
        "Payment Verified",
        "Trusted Employer"
      ],
      trustScore: 98,
      reputationScore: 97,
      sentimentAnalysis: "Superb developer reviews. Freelancers enjoy payment speed, high budgets, and interesting architecture challenges.",
      completionRate: 99.0,
      retentionRate: 95.0,
      paymentReliability: 100.0,
      avgResponseTime: "Within 2 hours",
      avgTimeToHire: "14 days",
      hiringSuccessRate: 96.0
    },
  ];

  const companies = [];
  for (const c of companyData) {
    const user = await prisma.user.create({
      data: {
        email: c.email,
        name: c.name,
        role: Role.COMPANY,
        passwordHash: "company123",
        image: c.logoUrl,
      },
    });

    const company = await prisma.company.create({
      data: {
        userId: user.id,
        companyName: c.companyName,
        description: c.description,
        industry: c.industry,
        website: c.website,
        location: c.location,
        logoUrl: c.logoUrl,
        companySize: c.companySize,
        foundedYear: c.foundedYear,
        linkedin: c.linkedin,
        email: c.email,
        phone: c.phone,
        missionVision: c.missionVision,
        workCulture: c.workCulture,
        hiringPhilosophy: c.hiringPhilosophy,
        galleryPhotos: c.galleryPhotos,
        galleryVideos: c.galleryVideos,
        benefits: c.benefits,
        teamMembers: c.teamMembers,
        verificationBadges: c.verificationBadges,
        trustScore: c.trustScore,
        reputationScore: c.reputationScore,
        sentimentAnalysis: c.sentimentAnalysis,
        completionRate: c.completionRate,
        retentionRate: c.retentionRate,
        paymentReliability: c.paymentReliability,
        avgResponseTime: c.avgResponseTime,
        avgTimeToHire: c.avgTimeToHire,
        hiringSuccessRate: c.hiringSuccessRate,
      },
    });
    companies.push(company);
  }

  // 4. Create Freelancers
  const freelancerData = [
    {
      email: "freelancer.jane@skillmatch.ai",
      name: "Jane Dev",
      bio: "Senior Full-Stack Engineer. Next.js specialist and Tailwind CSS designer.",
      skills: ["next.js", "react", "typescript", "tailwind", "node.js", "postgresql"],
      experienceYears: 6,
      portfolioUrl: "https://janedev.io",
      rating: 4.9,
      completedProjects: 24,
      completionRate: 98.0,
      professionalHeadline: "Senior React Developer & Next.js Expert",
      responseTime: "Within 1 hour",
      availabilityStatus: "AVAILABLE",
      verificationBadges: ["Identity Verified", "Top Rated"],
      experience: [
        {
          id: "j-exp-1",
          title: "Lead Frontend Engineer",
          company: "Vercel Flow Corp",
          startDate: "2022-03",
          endDate: "",
          current: true,
          description: "Led optimization of server-side rendered frameworks and responsive layout design components."
        },
        {
          id: "j-exp-2",
          title: "Software Architect",
          company: "Stripe Payment Labs",
          startDate: "2020-01",
          endDate: "2022-02",
          current: false,
          description: "Designed customizable checkout screens and integrated high-velocity APIs using TypeScript."
        }
      ],
      certifications: [
        {
          id: "j-cert-1",
          name: "AWS Certified Developer - Associate",
          issuer: "Amazon Web Services",
          year: "2023"
        }
      ],
      portfolioItems: [
        {
          id: "j-port-1",
          title: "AI Chatbot",
          description: "Next.js AI chat completion assistant using modern streaming models, customizable system instructions, and interactive conversation trees.",
          type: "GITHUB",
          url: "https://github.com/janedev/ai-chatbot"
        },
        {
          id: "j-port-2",
          title: "E-commerce Website",
          description: "A complete electronic storefront featuring inventory admin panel, responsive cart drawer, and secure credit card checkout flow.",
          type: "WEBSITE",
          url: "https://janedesignshop.com"
        }
      ]
    },
    {
      email: "freelancer.sam@skillmatch.ai",
      name: "Sam Backend",
      bio: "DevOps Engineer & Rust/Go microservices specialist. Loves high scalability.",
      skills: ["rust", "go", "node.js", "postgresql", "docker", "aws", "kubernetes"],
      experienceYears: 7,
      portfolioUrl: "https://github.com/sambackend",
      rating: 4.7,
      completedProjects: 18,
      completionRate: 94.0,
      professionalHeadline: "DevOps & Cloud Scalability Expert",
      responseTime: "Within 3 hours",
      availabilityStatus: "AVAILABLE",
      verificationBadges: ["Identity Verified", "Expert Developer"],
      experience: [
        {
          id: "s-exp-1",
          title: "DevOps Architect",
          company: "HashiCorp Systems",
          startDate: "2021-05",
          endDate: "",
          current: true,
          description: "Authoring terraform provider modules and establishing container mesh networks across multiple clouds."
        }
      ],
      certifications: [
        {
          id: "s-cert-1",
          name: "Kubernetes Certified Administrator (CKA)",
          issuer: "Cloud Native Computing Foundation",
          year: "2024"
        }
      ],
      portfolioItems: [
        {
          id: "s-port-1",
          title: "Expense Tracker",
          description: "A finance dashboard application to track monthly budget transactions, categorize expenses, and visualize spending patterns through SVG charts.",
          type: "GITHUB",
          url: "https://github.com/sambackend/expense-tracker"
        }
      ]
    },
    {
      email: "freelancer.alice@skillmatch.ai",
      name: "Alice Designer",
      bio: "Product & UI/UX Designer. Specialized in Framer Motion, Tailwind and design systems.",
      skills: ["react", "tailwind", "framer motion", "figma", "ui/ux", "typescript"],
      experienceYears: 4,
      portfolioUrl: "https://alicecreative.co",
      rating: 4.8,
      completedProjects: 11,
      completionRate: 100.0,
      professionalHeadline: "Creative Product & UI/UX Designer",
      responseTime: "Within 12 hours",
      availabilityStatus: "BUSY",
      verificationBadges: ["Preferred Freelancer"],
      experience: [
        {
          id: "a-exp-1",
          title: "UI/UX Designer",
          company: "Figma Design Labs",
          startDate: "2022-09",
          endDate: "",
          current: true,
          description: "Prototyping responsive design frameworks and micro-animation systems using Framer Motion."
        }
      ],
      certifications: [
        {
          id: "a-cert-1",
          name: "UX Design Professional Certificate",
          issuer: "Google Career Certificates",
          year: "2022"
        }
      ],
      portfolioItems: [
        {
          id: "a-port-1",
          title: "Movie Search App",
          description: "React client integrating with the TMDB API to search movies, view ratings, bookmark favorites, and watch streaming trailers.",
          type: "WEBSITE",
          url: "https://alicecreativemovies.web.app"
        }
      ]
    },
    {
      email: "freelancer.david@skillmatch.ai",
      name: "David Data",
      bio: "Data Scientist & AI Researcher. Python, PyTorch, and SQL query tuning.",
      skills: ["python", "pytorch", "postgresql", "sql", "ai", "machine learning"],
      experienceYears: 3,
      portfolioUrl: "https://daviddata.ai",
      rating: 4.4,
      completedProjects: 8,
      completionRate: 88.0,
      professionalHeadline: "Data Scientist & AI ML Researcher",
      responseTime: "Within 24 hours",
      availabilityStatus: "UNAVAILABLE",
      verificationBadges: [],
      experience: [
        {
          id: "d-exp-1",
          title: "Data Analyst",
          company: "Kaggle Labs",
          startDate: "2023-01",
          endDate: "",
          current: true,
          description: "Tuning training weights for deep learning neural nets and optimising Postgres analytics indexing."
        }
      ],
      certifications: [
        {
          id: "d-cert-1",
          name: "Professional Machine Learning Engineer",
          issuer: "Google Cloud",
          year: "2023"
        }
      ],
      portfolioItems: []
    },
  ];

  const freelancers = [];
  for (const f of freelancerData) {
    const user = await prisma.user.create({
      data: {
        email: f.email,
        name: f.name,
        role: Role.FREELANCER,
        passwordHash: "freelancer123",
        image: `https://api.dicebear.com/7.x/initials/svg?seed=${f.name}`,
      },
    });

    const freelancer = await prisma.freelancer.create({
      data: {
        userId: user.id,
        bio: f.bio,
        skills: f.skills,
        experienceYears: f.experienceYears,
        portfolioUrl: f.portfolioUrl,
        rating: f.rating,
        completedProjects: f.completedProjects,
        completionRate: f.completionRate,
        professionalHeadline: f.professionalHeadline,
        responseTime: f.responseTime,
        availabilityStatus: f.availabilityStatus,
        verificationBadges: f.verificationBadges,
        experience: f.experience,
        certifications: f.certifications,
        portfolioItems: f.portfolioItems,
      },
    });
    freelancers.push(freelancer);
  }

  // 5. Create Projects
  const projectData = [
    {
      companyId: companies[0].id,
      title: "AI Chat Assistant Dashboard",
      description: "Build a premium glassmorphic UI interface using Next.js 15, Framer Motion, and connect it to our OpenAI streaming endpoint. Strong UI skills and React 19 compliance are required.",
      budget: 4500,
      priority: ProjectPriority.HIGH,
      requiredSkills: ["next.js", "react", "typescript", "tailwind", "framer motion"],
      experienceRequired: 5,
      status: ProjectStatus.IN_PROGRESS,
      freelancersLimit: 3,
    },
    {
      companyId: companies[0].id,
      title: "PostgreSQL Database Migration",
      description: "Migrate our core transactions data to Neon Cloud Serverless DB, establish indexes, optimize query latency, and build automatic back-up scripts in Node/TypeScript.",
      budget: 3200,
      priority: ProjectPriority.MEDIUM,
      requiredSkills: ["postgresql", "node.js", "typescript", "sql"],
      experienceRequired: 4,
      status: ProjectStatus.OPEN,
      freelancersLimit: 1,
    },
    {
      companyId: companies[1].id,
      title: "Real-time Fintech Landing Page",
      description: "Design a visually stunning landing page for our payment gateways with 3D elements, interactive graphs showing transaction volumes, and interactive glassmorphic card elements.",
      budget: 2500,
      priority: ProjectPriority.LOW,
      requiredSkills: ["react", "tailwind", "framer motion", "ui/ux"],
      experienceRequired: 3,
      status: ProjectStatus.OPEN,
      freelancersLimit: 1,
    },
  ];

  const projects = [];
  for (const p of projectData) {
    const project = await prisma.project.create({
      data: {
        companyId: p.companyId,
        title: p.title,
        description: p.description,
        budget: p.budget,
        priority: p.priority,
        requiredSkills: p.requiredSkills,
        experienceRequired: p.experienceRequired,
        status: p.status,
        freelancersLimit: p.freelancersLimit,
      },
    });
    projects.push(project);
  }

  // 6. Pre-calculate AI Recommendations for each project
  console.log("Running AI scoring engine for projects...");
  for (const project of projects) {
    const scored = freelancers.map(freelancer => {
      const score = computeRecommendationScore(freelancer, project);
      return {
        projectId: project.id,
        freelancerId: freelancer.id,
        score,
      };
    });

    // Sort descending and store
    scored.sort((a, b) => b.score - a.score);
    for (const rec of scored) {
      await prisma.recommendation.create({
        data: rec,
      });
    }
  }

  // 7. Add some Applications
  // Jane Dev is hired for Project 1 (AI Chat Assistant Dashboard)
  const app1 = await prisma.application.create({
    data: {
      projectId: projects[0].id,
      freelancerId: freelancers[0].id,
      coverLetter: "I have 6 years of experience building scalable dashboards in Next.js. I would love to build this premium glassmorphic UI using Framer Motion.",
      aiScore: computeRecommendationScore(freelancers[0], projects[0]),
      status: ApplicationStatus.HIRED,
    },
  });

  // Sam Backend is hired for Project 1 (AI Chat Assistant Dashboard)
  const app2 = await prisma.application.create({
    data: {
      projectId: projects[0].id,
      freelancerId: freelancers[1].id,
      coverLetter: "Highly experienced backend developer. I specialize in cloud database optimization and have extensively worked with Neon Serverless Postgres.",
      aiScore: computeRecommendationScore(freelancers[1], projects[0]),
      status: ApplicationStatus.HIRED,
    },
  });

  // Alice Designer applies to Project 2 (PostgreSQL Database Migration)
  const app3 = await prisma.application.create({
    data: {
      projectId: projects[1].id,
      freelancerId: freelancers[2].id,
      coverLetter: "I can help configure user flows and layout optimization for query results views.",
      aiScore: computeRecommendationScore(freelancers[2], projects[1]),
      status: ApplicationStatus.PENDING,
    },
  });

  // 7.5. Add sample messages, files, updates, and tasks for Project 1 Workspace
  const companyUser = await prisma.user.findFirst({
    where: { companyProfile: { id: companies[0].id } },
  });
  const janeUser = await prisma.user.findFirst({
    where: { freelancerProfile: { id: freelancers[0].id } },
  });
  const samUser = await prisma.user.findFirst({
    where: { freelancerProfile: { id: freelancers[1].id } },
  });

  if (companyUser && janeUser && samUser) {
    // Seeding messages in "group"
    await prisma.message.createMany({
      data: [
        {
          projectId: projects[0].id,
          senderId: companyUser.id,
          content: "Welcome team! Let's build the ultimate AI Chat Assistant Dashboard.",
          channel: "group",
          createdAt: new Date(Date.now() - 3600000 * 24), // 24 hours ago
        },
        {
          projectId: projects[0].id,
          senderId: janeUser.id,
          content: "Thanks Sarah! I've started setting up the Next.js frontend structure and the Tailwind configuration.",
          channel: "group",
          createdAt: new Date(Date.now() - 3600000 * 22),
        },
        {
          projectId: projects[0].id,
          senderId: samUser.id,
          content: "Hi all! I will configure the API endpoints and serverless PostgreSQL connection.",
          channel: "group",
          createdAt: new Date(Date.now() - 3600000 * 20),
        },
      ],
    });

    // Seeding messages in "freelancers" (only accessible by freelancers)
    await prisma.message.createMany({
      data: [
        {
          projectId: projects[0].id,
          senderId: janeUser.id,
          content: "Hey Sam, should we use server actions or Route Handlers for the streaming completion endpoint?",
          channel: "freelancers",
          createdAt: new Date(Date.now() - 3600000 * 5),
        },
        {
          projectId: projects[0].id,
          senderId: samUser.id,
          content: "I think Next.js Server Actions with custom streams would work perfectly. What do you think?",
          channel: "freelancers",
          createdAt: new Date(Date.now() - 3600000 * 4),
        },
      ],
    });

    // Seeding private DMs between Jane and Company
    const dmJaneCompanyKey = [janeUser.id, companyUser.id].sort().join(":");
    await prisma.message.createMany({
      data: [
        {
          projectId: projects[0].id,
          senderId: janeUser.id,
          content: "Hi Sarah, do we have design mockups for the settings drawer?",
          channel: `dm:${dmJaneCompanyKey}`,
          createdAt: new Date(Date.now() - 3600000 * 2),
        },
        {
          projectId: projects[0].id,
          senderId: companyUser.id,
          content: "Yes Jane, let me share the Figma spec file under the Files tab.",
          channel: `dm:${dmJaneCompanyKey}`,
          createdAt: new Date(Date.now() - 3600000 * 1),
        },
      ],
    });

    // Seeding shared files
    await prisma.sharedFile.createMany({
      data: [
        {
          projectId: projects[0].id,
          uploadedById: companyUser.id,
          fileName: "Design_System_Spec.pdf",
          fileUrl: "/workspace/downloads/Design_System_Spec.pdf",
          fileSize: "2.4 MB",
          channel: "group",
          uploadedAt: new Date(Date.now() - 3600000 * 21),
        },
        {
          projectId: projects[0].id,
          uploadedById: janeUser.id,
          fileName: "glassmorphic-card-mockup.png",
          fileUrl: "/workspace/downloads/glassmorphic-card-mockup.png",
          fileSize: "840 KB",
          channel: "group",
          uploadedAt: new Date(Date.now() - 3600000 * 18),
        },
      ],
    });

    // Seeding Milestones / ProjectUpdates
    await prisma.projectUpdate.createMany({
      data: [
        {
          projectId: projects[0].id,
          createdById: companyUser.id,
          title: "Setup Glassmorphism Theme & Palette",
          description: "Initialize variables and components for dark-blue visual aesthetic.",
          status: "COMPLETED",
          createdAt: new Date(Date.now() - 3600000 * 24),
        },
        {
          projectId: projects[0].id,
          createdById: janeUser.id,
          title: "Frontend Dashboard Layout",
          description: "Design Slack-like layout with multi-pane support.",
          status: "IN_PROGRESS",
          createdAt: new Date(Date.now() - 3600000 * 12),
        },
        {
          projectId: projects[0].id,
          createdById: samUser.id,
          title: "OpenAI Endpoint Integration",
          description: "Deploy serverless route handlers to stream responses.",
          status: "PENDING",
          createdAt: new Date(Date.now() - 3600000 * 6),
        },
      ],
    });

    // Seeding Tasks
    await prisma.task.createMany({
      data: [
        {
          projectId: projects[0].id,
          title: "Define global theme styles in globals.css",
          description: "Setup CSS variables for custom colors and shadows",
          status: "DONE",
          priority: "HIGH",
          dueDate: new Date(Date.now() - 3600000 * 24),
          assignedToId: janeUser.id,
          createdById: companyUser.id,
        },
        {
          projectId: projects[0].id,
          title: "Setup Prisma Schema for collaborative features",
          description: "Migrate database models to support group routing",
          status: "DONE",
          priority: "HIGH",
          dueDate: new Date(Date.now() - 3600000 * 12),
          assignedToId: samUser.id,
          createdById: companyUser.id,
        },
        {
          projectId: projects[0].id,
          title: "Create left sidebar chat channel list",
          description: "Renders active channel navigation options",
          status: "IN_PROGRESS",
          priority: "MEDIUM",
          dueDate: new Date(Date.now() + 3600000 * 24), // tomorrow
          assignedToId: janeUser.id,
          createdById: companyUser.id,
        },
        {
          projectId: projects[0].id,
          title: "Configure Neon database connection pooling",
          description: "Adjust connection limits to prevent pool exhaustion",
          status: "IN_PROGRESS",
          priority: "HIGH",
          dueDate: new Date(Date.now() + 3600000 * 48), // in 2 days
          assignedToId: samUser.id,
          createdById: companyUser.id,
        },
        {
          projectId: projects[0].id,
          title: "Implement timeline task drag-drop controls",
          description: "Visual calendar view tracking tasks by due date",
          status: "TODO",
          priority: "LOW",
          dueDate: new Date(Date.now() + 3600000 * 120), // in 5 days
          assignedToId: janeUser.id,
          createdById: companyUser.id,
        },
      ],
    });
  }

  // 8. Add some Reviews
  // Sarah Chen (Quantum Labs AI) reviews Jane Dev on a previous project
  await prisma.review.create({
    data: {
      projectId: projects[0].id,
      reviewerId: companies[0].userId, // user id of reviewer
      revieweeId: freelancers[0].userId, // user id of reviewee
      rating: 5,
      comment: "Jane is an exceptional engineer. She delivered the dashboard in record time with beautiful transitions.",
    },
  });

  // 9. Add some Notifications
  // For Admin
  await prisma.notification.create({
    data: {
      userId: adminUser.id,
      title: "System Initialized",
      message: "Seed data created successfully with 4 freelancers, 2 companies, and 3 active projects.",
      read: false,
    },
  });

  // For Freelancers
  await prisma.notification.create({
    data: {
      userId: freelancers[0].userId,
      title: "New Matching Project",
      message: "Quantum Labs AI posted 'AI Chat Assistant Dashboard' matching 100% of your skillset. Apply now!",
      read: false,
    },
  });

  // For Companies
  await prisma.notification.create({
    data: {
      userId: companies[0].userId,
      title: "New Application Received",
      message: "Jane Dev has applied to your project 'AI Chat Assistant Dashboard'. AI Recommendation Match: 97.6%",
      read: false,
    },
  });

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
