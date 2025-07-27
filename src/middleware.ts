// import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import type { NextMiddleware } from 'next/server'

// const isProtectedRoute = createRouteMatcher(['/dashboard(.*)']);

const defaultMiddleware: NextMiddleware = async (req: NextRequest) => {
  return NextResponse.next();
}

export default defaultMiddleware


export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)'
  ]
};
