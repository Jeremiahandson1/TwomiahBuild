// Project data — populate via CMS admin panel
export const projects = [];
// Helper to get projects by type/service
export function getProjectsByType(type) {
  return projects.filter(p => p.type === type || p.serviceId === type);
}
