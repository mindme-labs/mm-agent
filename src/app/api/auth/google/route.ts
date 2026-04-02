import { redirect } from 'next/navigation'
import { getGoogleOAuthURL } from '@/lib/auth'

export async function GET() {
  const url = getGoogleOAuthURL()
  redirect(url)
}
