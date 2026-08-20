import { requireViewer } from "@/data/server/context";
import { allCompanies } from "@/data/server/entities";
import { projectCounts } from "@/data/server/stats";
import { CompaniesClient } from "./CompaniesClient";

export default async function AdminCompaniesPage() {
  await requireViewer("ADMIN", "/admin/companies");

  const companies = await allCompanies();
  const counts = await projectCounts(companies.map((c) => c.id));

  return (
    <CompaniesClient companies={companies} projectCounts={Object.fromEntries(counts)} />
  );
}
