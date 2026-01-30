import { useState, useEffect, useCallback } from 'react';
import type { Bot, CreateBotInput } from './types';
import { fetchBots, createBot, deleteBot, startBot, stopBot } from './api';
import BotList from './components/BotList';
import CreateWizard from './components/CreateWizard';

export default function App() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWizard, setShowWizard] = useState(false);

  const loadBots = useCallback(async () => {
    try {
      const data = await fetchBots();
      setBots(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bots');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBots();

    // Poll for updates every 5 seconds
    const interval = setInterval(loadBots, 5000);
    return () => clearInterval(interval);
  }, [loadBots]);

  const handleCreate = async (input: CreateBotInput) => {
    await createBot(input);
    await loadBots();
  };

  const handleStart = async (id: string) => {
    setActionLoading(true);
    try {
      await startBot(id);
      await loadBots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start bot');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async (id: string) => {
    setActionLoading(true);
    try {
      await stopBot(id);
      await loadBots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop bot');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(true);
    try {
      await deleteBot(id);
      await loadBots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bot');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>BotMaker</h1>
        <button className="btn btn-primary" onClick={() => setShowWizard(true)}>
          + Create Bot
        </button>
      </header>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="empty-state">
          <p>Loading...</p>
        </div>
      ) : (
        <BotList
          bots={bots}
          onStart={handleStart}
          onStop={handleStop}
          onDelete={handleDelete}
          onCreateClick={() => setShowWizard(true)}
          loading={actionLoading}
        />
      )}

      {showWizard && (
        <CreateWizard
          onClose={() => setShowWizard(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
