// import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function Page() {
  // const { userId } = await auth();
  const userId = 'admin'

  if (!userId) {
    return redirect('/auth/sign-in');
  } else {
    redirect('/overview');
  }
}
