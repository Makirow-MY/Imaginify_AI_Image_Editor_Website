import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes using createRouteMatcher
const isPublicRoute = createRouteMatcher([
  '/',
  '/api/webhooks/clerk',
  '/api/webhooks/stripe',
]);

export default clerkMiddleware((auth, req) => {
  // Protect all routes except public ones
  if (!isPublicRoute(req)) {
    auth();
  }
});

export const config = {
  matcher: ['/((?!.*\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};