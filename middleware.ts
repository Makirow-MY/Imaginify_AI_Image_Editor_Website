import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes using createRouteMatcher
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/clerk',
  '/api/webhooks/stripe',
]);

export default clerkMiddleware((auth, req) => {
  // Protect all routes except public ones
 if (!isPublicRoute(req)) {
    await auth.protect() // Redirects unauthenticated users to /sign-in
  }
});

export const config = {
  matcher: ['/((?!.*\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
