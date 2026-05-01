import Placeholder from '@/components/workspace/Placeholder';

export default function AnnouncementsPage() {
  return (
    <Placeholder
      title="Announcements"
      description="Pinned-first feed with reactions and threaded comments."
      endpoints={[
        'GET    /workspaces/:id/announcements',
        'POST   /workspaces/:id/announcements      (admin)',
        'PATCH  /announcements/:id                 (admin)',
        'POST   /announcements/:id/reactions',
        'POST   /announcements/:id/comments',
      ]}
      criteria={[
        'Tiptap editor with toolbar (bold, italic, lists, link, code, image)',
        'Pin toggles a 📌 indicator and re-sorts the feed',
        'Emoji picker with 6 default reactions; clicking your own removes it',
        'Comments inline with author avatar + relative time',
        'Real-time push of announcement:created, reaction:added/removed, comment:created',
      ]}
    />
  );
}
