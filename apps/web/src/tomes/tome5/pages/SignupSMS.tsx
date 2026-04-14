// apps/web/src/tomes/tome5/pages/SignupSMS.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function SignupSMS() {
  const [step, setStep] = useState<'form' | 'sms' | 'email_sent'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/p1/packs';

  // Récupérer données projet depuis localStorage
  const projectDataRaw = localStorage.getItem('citurbarea_pending_project');
  const projectData = projectDataRaw ? JSON.parse(projectDataRaw) : null;

  // BLOQUER si pas de données projet
  useEffect(() => {
    if (!projectData || !projectData.firstname || !projectData.email) {
      alert('⚠️ Veuillez d\'abord compléter votre projet sur /p1/qualify');
      navigate('/p1/qualify');
    } else {
      // Pré-remplir avec données projet
      setEmail(projectData.email || '');
      setPhone(projectData.phone || '');
    }
  }, [projectData, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setLoading(true);

    try {
      // Appel API signup (à créer)
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          phone,
          firstname: projectData.firstname,
          lastname: projectData.lastname,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erreur lors de la création du compte');
      }

      const data = await response.json();
      setUserId(data.userId);
      setStep('sms');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySMS = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/verify-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code: smsCode }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Code SMS invalide');
      }

      setStep('email_sent');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendSMS = async () => {
    setError('');
    setLoading(true);

    try {
      await fetch('/api/auth/resend-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      alert('Code SMS renvoyé');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Étape 1 : Formulaire
  if (step === 'form') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, rgba(201,162,39,0.05), rgba(232,216,166,0.05))',
        padding: '40px 20px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '500px',
          background: 'white',
          borderRadius: '20px',
          padding: '48px',
          boxShadow: '0 8px 32px rgba(11,27,58,0.12)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#0B1B3A',
              margin: '0 0 12px',
            }}>
              Créer mon dossier
            </h1>
            <p style={{
              fontSize: '15px',
              color: 'rgba(11,27,58,0.68)',
            }}>
              Dernière étape avant d'accéder aux packs
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                color: 'rgba(11,27,58,0.82)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
              }}>
                Email (nom d'utilisateur) <span style={{ color: '#C9A227' }}>*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '1px solid rgba(201,162,39,0.25)',
                  borderRadius: '12px',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                color: 'rgba(11,27,58,0.82)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
              }}>
                Mot de passe <span style={{ color: '#C9A227' }}>*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                minLength={8}
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '1px solid rgba(201,162,39,0.25)',
                  borderRadius: '12px',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                color: 'rgba(11,27,58,0.82)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
              }}>
                Confirmer mot de passe <span style={{ color: '#C9A227' }}>*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retapez votre mot de passe"
                minLength={8}
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '1px solid rgba(201,162,39,0.25)',
                  borderRadius: '12px',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                color: 'rgba(11,27,58,0.82)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
              }}>
                Téléphone <span style={{ color: '#C9A227' }}>*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0612345678"
                pattern="[0-9]{10}"
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '1px solid rgba(201,162,39,0.25)',
                  borderRadius: '12px',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
              <div style={{
                fontSize: '13px',
                color: 'rgba(11,27,58,0.68)',
                marginTop: '6px',
              }}>
                📱 Vous recevrez un code SMS pour vérifier votre numéro
              </div>
            </div>

            {error && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(220,38,38,0.1)',
                border: '1px solid rgba(220,38,38,0.3)',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '14px',
                marginBottom: '20px',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                background: loading ? '#ccc' : 'linear-gradient(135deg, #C9A227, #E6C75B)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
              }}
            >
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>

          <div style={{
            textAlign: 'center',
            marginTop: '24px',
            fontSize: '14px',
            color: 'rgba(11,27,58,0.68)',
          }}>
            Déjà un compte ?{' '}
            <a
              href="/auth/login"
              style={{
                color: '#C9A227',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Se connecter
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Étape 2 : Vérification SMS
  if (step === 'sms') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, rgba(201,162,39,0.05), rgba(232,216,166,0.05))',
        padding: '40px 20px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '500px',
          background: 'white',
          borderRadius: '20px',
          padding: '48px',
          boxShadow: '0 8px 32px rgba(11,27,58,0.12)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #C9A227, #E6C75B)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '40px',
            }}>
              📱
            </div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#0B1B3A',
              margin: '0 0 12px',
            }}>
              Vérification SMS
            </h1>
            <p style={{
              fontSize: '15px',
              color: 'rgba(11,27,58,0.68)',
            }}>
              Un code à 6 chiffres a été envoyé au<br />
              <strong style={{ color: '#0B1B3A' }}>{phone}</strong>
            </p>
          </div>

          <form onSubmit={handleVerifySMS}>
            <div style={{ marginBottom: '28px' }}>
              <input
                type="text"
                value={smsCode}
                onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                pattern="[0-9]{6}"
                required
                style={{
                  width: '100%',
                  padding: '20px',
                  border: '2px solid rgba(201,162,39,0.25)',
                  borderRadius: '12px',
                  fontSize: '32px',
                  fontWeight: 700,
                  textAlign: 'center',
                  letterSpacing: '8px',
                  outline: 'none',
                }}
              />
            </div>

            {error && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(220,38,38,0.1)',
                border: '1px solid rgba(220,38,38,0.3)',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '14px',
                marginBottom: '20px',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || smsCode.length !== 6}
              style={{
                width: '100%',
                padding: '16px',
                background: (loading || smsCode.length !== 6) ? '#ccc' : 'linear-gradient(135deg, #C9A227, #E6C75B)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: (loading || smsCode.length !== 6) ? 'not-allowed' : 'pointer',
                marginBottom: '16px',
              }}
            >
              {loading ? 'Vérification...' : 'Valider le code'}
            </button>

            <button
              type="button"
              onClick={handleResendSMS}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: 'transparent',
                color: '#C9A227',
                border: '1px solid rgba(201,162,39,0.3)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              Renvoyer le code
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Étape 3 : Email envoyé
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, rgba(201,162,39,0.05), rgba(232,216,166,0.05))',
      padding: '40px 20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '500px',
        background: 'white',
        borderRadius: '20px',
        padding: '48px',
        boxShadow: '0 8px 32px rgba(11,27,58,0.12)',
        textAlign: 'center',
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #10b981, #34d399)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: '40px',
        }}>
          ✅
        </div>

        <h1 style={{
          fontSize: '28px',
          fontWeight: 700,
          color: '#0B1B3A',
          margin: '0 0 16px',
        }}>
          SMS vérifié !
        </h1>

        <p style={{
          fontSize: '15px',
          color: 'rgba(11,27,58,0.75)',
          marginBottom: '24px',
          lineHeight: 1.6,
        }}>
          Un email de confirmation a été envoyé à<br />
          <strong style={{ color: '#0B1B3A' }}>{email}</strong>
        </p>

        <div style={{
          padding: '20px',
          background: 'rgba(201,162,39,0.08)',
          borderRadius: '12px',
          marginBottom: '24px',
        }}>
          <div style={{
            fontSize: '40px',
            marginBottom: '12px',
          }}>
            📧
          </div>
          <p style={{
            fontSize: '14px',
            color: 'rgba(11,27,58,0.82)',
            margin: 0,
          }}>
            Cliquez sur le lien dans l'email pour<br />
            <strong>activer votre compte</strong> et accéder aux packs.
          </p>
        </div>

        <p style={{
          fontSize: '13px',
          color: 'rgba(11,27,58,0.68)',
        }}>
          Vous pouvez fermer cette page.<br />
          <small>Pensez à vérifier vos spams si vous ne recevez pas l'email.</small>
        </p>
      </div>
    </div>
  );
}
