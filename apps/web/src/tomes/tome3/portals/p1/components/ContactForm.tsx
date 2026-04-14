// apps/web/src/tomes/tome3/portals/p1/components/ContactForm.tsx

import React, { useState } from 'react';

interface Props {
  onSubmit: (data: { firstname: string; lastname: string; email: string; phone: string }) => void;
  initialData?: { firstname?: string; lastname?: string; email?: string; phone?: string };
}

export default function ContactForm({ onSubmit, initialData = {} }: Props) {
  const [firstname, setFirstname] = useState(initialData.firstname || '');
  const [lastname, setLastname] = useState(initialData.lastname || '');
  const [email, setEmail] = useState(initialData.email || '');
  const [phone, setPhone] = useState(initialData.phone || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!firstname.trim()) newErrors.firstname = 'Prénom requis';
    if (!lastname.trim()) newErrors.lastname = 'Nom requis';
    
    if (!email.trim()) {
      newErrors.email = 'Email requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email invalide';
    }
    
    if (!phone.trim()) {
      newErrors.phone = 'Téléphone requis';
    } else if (!/^[0-9]{10}$/.test(phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Téléphone invalide (10 chiffres)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ firstname, lastname, email, phone: phone.replace(/\s/g, '') });
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        border: '1px solid rgba(201,162,39,0.25)',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 4px 12px rgba(11,27,58,0.08)',
      }}>
        <h3 style={{
          fontSize: '20px',
          fontWeight: 700,
          color: '#0B1B3A',
          margin: '0 0 24px',
        }}>
          Vos coordonnées
        </h3>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 700,
            color: 'rgba(11,27,58,0.82)',
            marginBottom: '8px',
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
          }}>
            PRÉNOM <span style={{ color: '#C9A227' }}>*</span>
          </label>
          <input
            type="text"
            value={firstname}
            onChange={(e) => setFirstname(e.target.value)}
            placeholder="Ex: Mohammed"
            style={{
              width: '100%',
              padding: '14px 16px',
              border: errors.firstname ? '2px solid #dc2626' : '1px solid rgba(201,162,39,0.25)',
              borderRadius: '12px',
              fontSize: '15px',
              background: 'white',
              outline: 'none',
            }}
          />
          {errors.firstname && (
            <div style={{ color: '#dc2626', fontSize: '13px', marginTop: '6px' }}>
              {errors.firstname}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 700,
            color: 'rgba(11,27,58,0.82)',
            marginBottom: '8px',
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
          }}>
            NOM <span style={{ color: '#C9A227' }}>*</span>
          </label>
          <input
            type="text"
            value={lastname}
            onChange={(e) => setLastname(e.target.value)}
            placeholder="Ex: Alami"
            style={{
              width: '100%',
              padding: '14px 16px',
              border: errors.lastname ? '2px solid #dc2626' : '1px solid rgba(201,162,39,0.25)',
              borderRadius: '12px',
              fontSize: '15px',
              background: 'white',
              outline: 'none',
            }}
          />
          {errors.lastname && (
            <div style={{ color: '#dc2626', fontSize: '13px', marginTop: '6px' }}>
              {errors.lastname}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 700,
            color: 'rgba(11,27,58,0.82)',
            marginBottom: '8px',
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
          }}>
            EMAIL <span style={{ color: '#C9A227' }}>*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Ex: m.alami@email.com"
            style={{
              width: '100%',
              padding: '14px 16px',
              border: errors.email ? '2px solid #dc2626' : '1px solid rgba(201,162,39,0.25)',
              borderRadius: '12px',
              fontSize: '15px',
              background: 'white',
              outline: 'none',
            }}
          />
          {errors.email && (
            <div style={{ color: '#dc2626', fontSize: '13px', marginTop: '6px' }}>
              {errors.email}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '28px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 700,
            color: 'rgba(11,27,58,0.82)',
            marginBottom: '8px',
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
          }}>
            TÉLÉPHONE <span style={{ color: '#C9A227' }}>*</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ex: 0612345678"
            style={{
              width: '100%',
              padding: '14px 16px',
              border: errors.phone ? '2px solid #dc2626' : '1px solid rgba(201,162,39,0.25)',
              borderRadius: '12px',
              fontSize: '15px',
              background: 'white',
              outline: 'none',
            }}
          />
          {errors.phone && (
            <div style={{ color: '#dc2626', fontSize: '13px', marginTop: '6px' }}>
              {errors.phone}
            </div>
          )}
          <div style={{ fontSize: '13px', color: 'rgba(11,27,58,0.68)', marginTop: '6px' }}>
            Vous recevrez un code SMS pour vérifier votre numéro
          </div>
        </div>

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '16px',
            background: 'linear-gradient(135deg, #C9A227, #E6C75B)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.3s',
          }}
        >
          Continuer vers les détails →
        </button>
      </div>
    </form>
  );
}
