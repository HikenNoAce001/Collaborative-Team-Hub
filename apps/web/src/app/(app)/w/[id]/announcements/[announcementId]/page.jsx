import AnnouncementDetailView from '@/features/announcements/AnnouncementDetailView';

/**
 * @param {{ params: Promise<{ id: string, announcementId: string }> }} props
 */
export default async function AnnouncementDetailPage({ params }) {
  const { announcementId } = await params;
  return <AnnouncementDetailView announcementId={announcementId} />;
}
