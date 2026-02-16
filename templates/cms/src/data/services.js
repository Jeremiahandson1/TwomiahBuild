// Service data — populate via CMS admin panel
export const services = [];

// Helper to get service by ID
export function getServiceById(id) {
  return services.find(s => s.id === id);
}

// Helper to get service by slug
export function getServiceBySlug(slug) {
  return services.find(s => s.id === slug || s.slug === slug);
}
