import { useState } from 'react';
import type { CreateBotInput } from '../types';

interface CreateWizardProps {
  onClose: () => void;
  onSubmit: (input: CreateBotInput) => Promise<void>;
}

const STEPS = ['Name & Model', 'API Key', 'Channel', 'Persona', 'Review'];

const AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
];

const MODELS: Record<string, string[]> = {
  openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
  google: ['gemini-pro', 'gemini-ultra'],
};

export default function CreateWizard({ onClose, onSubmit }: CreateWizardProps) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<CreateBotInput>({
    name: '',
    ai_provider: 'openai',
    model: 'gpt-4',
    channel_type: 'telegram',
    channel_token: '',
    api_key: '',
    persona: {
      name: '',
      identity: '',
      description: '',
    },
  });

  const updateField = <K extends keyof CreateBotInput>(
    field: K,
    value: CreateBotInput[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updatePersona = (field: keyof CreateBotInput['persona'], value: string) => {
    setFormData((prev) => ({
      ...prev,
      persona: { ...prev.persona, [field]: value },
    }));
  };

  const validateStep = (): boolean => {
    setError('');

    switch (step) {
      case 0:
        if (!formData.name.trim()) {
          setError('Bot name is required');
          return false;
        }
        break;
      case 1:
        if (!formData.api_key.trim()) {
          setError('API key is required');
          return false;
        }
        break;
      case 2:
        if (!formData.channel_token.trim()) {
          setError('Channel token is required');
          return false;
        }
        break;
      case 3:
        if (!formData.persona.name.trim()) {
          setError('Persona name is required');
          return false;
        }
        if (!formData.persona.identity.trim()) {
          setError('Persona identity is required');
          return false;
        }
        if (!formData.persona.description.trim()) {
          setError('Persona description is required');
          return false;
        }
        break;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    setStep((s) => s - 1);
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);

    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bot');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <>
            <h3>Name & Model</h3>
            <div className="form-group">
              <label>Bot Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="my-awesome-bot"
              />
              <small>Unique name for your bot</small>
            </div>
            <div className="form-group">
              <label>AI Provider</label>
              <select
                value={formData.ai_provider}
                onChange={(e) => {
                  updateField('ai_provider', e.target.value);
                  updateField('model', MODELS[e.target.value]?.[0] || '');
                }}
              >
                {AI_PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Model</label>
              <select
                value={formData.model}
                onChange={(e) => updateField('model', e.target.value)}
              >
                {(MODELS[formData.ai_provider] || []).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </>
        );

      case 1:
        return (
          <>
            <h3>API Key</h3>
            <div className="form-group">
              <label>AI Provider API Key</label>
              <input
                type="password"
                value={formData.api_key}
                onChange={(e) => updateField('api_key', e.target.value)}
                placeholder="sk-..."
              />
              <small>Your {formData.ai_provider} API key (stored securely)</small>
            </div>
          </>
        );

      case 2:
        return (
          <>
            <h3>Channel</h3>
            <div className="form-group">
              <label>Channel Type</label>
              <select
                value={formData.channel_type}
                onChange={(e) =>
                  updateField('channel_type', e.target.value as 'telegram' | 'discord')
                }
              >
                <option value="telegram">Telegram</option>
                <option value="discord">Discord</option>
              </select>
            </div>
            <div className="form-group">
              <label>
                {formData.channel_type === 'telegram' ? 'Bot Token' : 'Bot Token'}
              </label>
              <input
                type="password"
                value={formData.channel_token}
                onChange={(e) => updateField('channel_token', e.target.value)}
                placeholder={
                  formData.channel_type === 'telegram'
                    ? '123456:ABC-DEF...'
                    : 'MTA2...'
                }
              />
              <small>
                {formData.channel_type === 'telegram'
                  ? 'Get this from @BotFather'
                  : 'Get this from Discord Developer Portal'}
              </small>
            </div>
          </>
        );

      case 3:
        return (
          <>
            <h3>Persona</h3>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={formData.persona.name}
                onChange={(e) => updatePersona('name', e.target.value)}
                placeholder="Assistant"
              />
              <small>Display name for the bot persona</small>
            </div>
            <div className="form-group">
              <label>Identity</label>
              <textarea
                value={formData.persona.identity}
                onChange={(e) => updatePersona('identity', e.target.value)}
                placeholder="You are a helpful assistant..."
              />
              <small>Core identity and personality traits</small>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.persona.description}
                onChange={(e) => updatePersona('description', e.target.value)}
                placeholder="A friendly bot that helps users with..."
              />
              <small>What the bot does and how it behaves</small>
            </div>
          </>
        );

      case 4:
        return (
          <>
            <h3>Review</h3>
            <div className="review-section">
              <h4>Bot Details</h4>
              <p>
                <strong>Name:</strong> {formData.name}
              </p>
              <p>
                <strong>Model:</strong> {formData.ai_provider} / {formData.model}
              </p>
              <p>
                <strong>Channel:</strong> {formData.channel_type}
              </p>
            </div>
            <div className="review-section">
              <h4>Persona</h4>
              <p>
                <strong>Name:</strong> {formData.persona.name}
              </p>
              <p>
                <strong>Identity:</strong> {formData.persona.identity}
              </p>
              <p>
                <strong>Description:</strong> {formData.persona.description}
              </p>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="wizard-overlay" onClick={onClose}>
      <div className="wizard" onClick={(e) => e.stopPropagation()}>
        <div className="wizard-header">
          <h2>Create Bot</h2>
          <button className="wizard-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="wizard-steps">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`wizard-step ${i === step ? 'active' : ''} ${
                i < step ? 'completed' : ''
              }`}
            />
          ))}
        </div>

        <div className="wizard-content">
          {error && <div className="error-message">{error}</div>}
          {renderStepContent()}
        </div>

        <div className="wizard-footer">
          <button
            className="btn"
            onClick={handleBack}
            disabled={step === 0 || submitting}
          >
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button className="btn btn-primary" onClick={handleNext}>
              Next
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Bot'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
