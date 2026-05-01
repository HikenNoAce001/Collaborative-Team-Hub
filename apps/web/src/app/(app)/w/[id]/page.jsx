import { redirect } from 'next/navigation';

/**
 * @param {{ params: Promise<{ id: string }> }} props
 */
export default async function WorkspaceIndex({ params }) {
  const { id } = await params;
  redirect(`/w/${id}/announcements`);
}
