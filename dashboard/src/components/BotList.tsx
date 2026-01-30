import type { Bot } from '../types';
import BotCard from './BotCard';

interface BotListProps {
  bots: Bot[];
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onDelete: (id: string) => void;
  onCreateClick: () => void;
  loading: boolean;
}

export default function BotList({
  bots,
  onStart,
  onStop,
  onDelete,
  onCreateClick,
  loading,
}: BotListProps) {
  if (bots.length === 0) {
    return (
      <div className="empty-state">
        <h2>No bots yet</h2>
        <p>Create your first bot to get started.</p>
        <button className="btn btn-primary" onClick={onCreateClick}>
          Create Bot
        </button>
      </div>
    );
  }

  return (
    <div className="bot-grid">
      {bots.map((bot) => (
        <BotCard
          key={bot.id}
          bot={bot}
          onStart={onStart}
          onStop={onStop}
          onDelete={onDelete}
          loading={loading}
        />
      ))}
    </div>
  );
}
