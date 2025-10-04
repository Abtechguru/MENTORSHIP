// Basic authentication
router.get('/profile', authMiddleware, profileController);

// Admin-only routes
router.get('/admin', authMiddleware, requireAdmin, adminController);

// Role-based access
router.get('/mentor-dashboard', authMiddleware, requireRole(['mentor', 'admin']), mentorController);

// Public routes with optional auth
router.get('/public-data', optionalAuth, publicController);

// Refresh token endpoint
router.post('/refresh-token', (req, res) => {
  const refreshToken = extractToken(req);
  const { decoded, error } = verifyRefreshToken(refreshToken);
  // ... handle token refresh logic
});
