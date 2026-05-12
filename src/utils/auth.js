export const getDefaultRoute = (user) => {
  if (user?.role === 'admin') {
    return '/admin';
  }

  return '/student';
};
