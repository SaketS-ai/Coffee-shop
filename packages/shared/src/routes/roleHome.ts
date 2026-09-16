// Where each authenticated role lands after login (and where a route guard
// sends a signed-in user who hits a URL outside their own role's surface).
export function homePathForRole(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'BARISTA': {
      const activeCafeId = localStorage.getItem('social_cup_active_cafe_id');
      return activeCafeId ? `/barista/${activeCafeId}` : '/barista';
    }
    case 'MEMBER':
    default:
      return '/app';
  }
}
