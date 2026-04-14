// apps/web/src/tomes/tome3/portals/p1/components/ProjectDetailsForm.tsx

import React, { useState } from 'react';
import type { ProjectType } from "../../../../../domain/p1/types";

interface Props {
  projectType: ProjectType;
  onSubmit: (data: any) => void;
  initialData?: any;
}

export default function ProjectDetailsForm({ projectType, onSubmit, initialData = {} }: Props) {
  // Normalize legacy values (older versions used unaccented keys)
  const normalizedVillaType = (() => {
    const v = initialData.villaType;
    if (v === 'jumelee') return 'jumelée';
    if (v === 'isolee') return 'isolée';
    return v;
  })();

  const [formData, setFormData] = useState({
    region: initialData.region || '',
    province: initialData.province || '',
    commune: initialData.commune || '',
    villaType: normalizedVillaType || '',
    niveau: initialData.niveau || '',
    immeubleType: initialData.immeubleType || '',
    area: initialData.area || '',
    budget: initialData.budget || '',
    timeline: initialData.timeline || '',
    ownerStatus: initialData.ownerStatus || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.region) newErrors.region = 'Région requise';
    if (!formData.province) newErrors.province = 'Province requise';
    if (!formData.commune) newErrors.commune = 'Commune requise';
    
    if (projectType === 'villa' && !formData.villaType) {
      newErrors.villaType = 'Type de villa requis';
    }
    
    if (projectType === 'immeuble') {
      if (!formData.niveau) newErrors.niveau = 'Niveau requis';
      if (!formData.immeubleType) newErrors.immeubleType = 'Type de lot requis';
    }
    
    if (projectType !== 'renovation') {
      if (!formData.area) newErrors.area = 'Surface requise';
      if (!formData.budget) newErrors.budget = 'Budget requis';
      if (!formData.ownerStatus) newErrors.ownerStatus = 'Statut propriétaire requis';
    }
    
    if (!formData.timeline) newErrors.timeline = 'Délai requis';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      // Doctrine (B5): keep UI unchanged, but enrich payload with locked business fields.
      // Villa subtype => facades lock (bande=2, jumelée=3, isolée=4)
      const facades =
        projectType === 'villa'
          ? formData.villaType === 'bande'
            ? 2
            : formData.villaType === 'jumelée'
              ? 3
              : formData.villaType === 'isolée'
                ? 4
                : undefined
          : undefined;

      onSubmit({
        ...formData,
        facades,
      });
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        border: '1px solid rgba(201,162,39,0.25)',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 4px 12px rgba(11,27,58,0.08)',
      }}>
        {/* Localisation */}
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
          Localisation
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
              RÉGION <span style={{ color: '#C9A227' }}>*</span>
            </label>
            <select
              value={formData.region}
              onChange={(e) => handleChange('region', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: errors.region ? '2px solid #dc2626' : '1px solid rgba(201,162,39,0.25)',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            >
              <option value="">Choisir</option>
              <option value="Tanger-Tétouan-Al Hoceima">Tanger-Tétouan-Al Hoceima</option>
              <option value="Casablanca-Settat">Casablanca-Settat</option>
              <option value="Rabat-Salé-Kénitra">Rabat-Salé-Kénitra</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
              PROVINCE <span style={{ color: '#C9A227' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.province}
              onChange={(e) => handleChange('province', e.target.value)}
              placeholder="Ex: Tanger-Assilah"
              style={{
                width: '100%',
                padding: '12px',
                border: errors.province ? '2px solid #dc2626' : '1px solid rgba(201,162,39,0.25)',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
              COMMUNE <span style={{ color: '#C9A227' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.commune}
              onChange={(e) => handleChange('commune', e.target.value)}
              placeholder="Ex: Tanger"
              style={{
                width: '100%',
                padding: '12px',
                border: errors.commune ? '2px solid #dc2626' : '1px solid rgba(201,162,39,0.25)',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>
        </div>

        {/* Détails selon type */}
        {projectType === 'villa' && (
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
              Détails Villa
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                TYPE DE VILLA <span style={{ color: '#C9A227' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {['bande', 'jumelée', 'isolée'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleChange('villaType', type)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: formData.villaType === type ? '2px solid #C9A227' : '1px solid rgba(201,162,39,0.25)',
                      background: formData.villaType === type ? 'rgba(201,162,39,0.1)' : 'white',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    {type === 'bande' && 'En bande'}
                    {type === 'jumelée' && 'Jumelée'}
                    {type === 'isolée' && 'Isolée'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {projectType === 'immeuble' && (
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
              Détails Immeuble
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                  NIVEAU <span style={{ color: '#C9A227' }}>*</span>
                </label>
                <select
                  value={formData.niveau}
                  onChange={(e) => handleChange('niveau', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid rgba(201,162,39,0.25)',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                >
                  <option value="">Choisir</option>
                  <option value="R+1">R+1</option>
                  <option value="R+2">R+2</option>
                  <option value="R+3">R+3</option>
                  <option value="R+4">R+4</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                  TYPE DE LOT <span style={{ color: '#C9A227' }}>*</span>
                </label>
                <select
                  value={formData.immeubleType}
                  onChange={(e) => handleChange('immeubleType', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid rgba(201,162,39,0.25)',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                >
                  <option value="">Choisir</option>
                  <option value="appartement">Appartement</option>
                  <option value="duplex">Duplex</option>
                  <option value="local_commercial">Local commercial</option>
                  <option value="bureau">Bureau</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Dimensions & Budget */}
        {projectType !== 'renovation' && (
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
              Dimensions & Budget
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                  SURFACE DU TERRAIN (m²) <span style={{ color: '#C9A227' }}>*</span>
                </label>
                <input
                  type="number"
                  value={formData.area}
                  onChange={(e) => handleChange('area', e.target.value)}
                  placeholder="Ex: 300"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid rgba(201,162,39,0.25)',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                  BUDGET ESTIMÉ <span style={{ color: '#C9A227' }}>*</span>
                </label>
                <select
                  value={formData.budget}
                  onChange={(e) => handleChange('budget', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid rgba(201,162,39,0.25)',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                >
                  <option value="">Choisir</option>
                  <option value="< 300000">Moins de 300 000 MAD</option>
                  <option value="300000-500000">300 000 - 500 000 MAD</option>
                  <option value="500000-1000000">500 000 - 1 000 000 MAD</option>
                  <option value="> 1000000">Plus de 1 000 000 MAD</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                  PROPRIÉTAIRE ? <span style={{ color: '#C9A227' }}>*</span>
                </label>
                <select
                  value={formData.ownerStatus}
                  onChange={(e) => handleChange('ownerStatus', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid rgba(201,162,39,0.25)',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                >
                  <option value="">Choisir</option>
                  <option value="yes">Oui</option>
                  <option value="no">Non</option>
                  <option value="copropriete">Copropriété</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Délai */}
        <div style={{ marginBottom: '28px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
            DÉLAI SOUHAITÉ <span style={{ color: '#C9A227' }}>*</span>
          </label>
          <select
            value={formData.timeline}
            onChange={(e) => handleChange('timeline', e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid rgba(201,162,39,0.25)',
              borderRadius: '8px',
              fontSize: '14px',
            }}
          >
            <option value="">Choisir</option>
            <option value="< 3-mois">Moins de 3 mois</option>
            <option value="3-6-mois">3 à 6 mois</option>
            <option value="6-12-mois">6 à 12 mois</option>
            <option value="> 12-mois">Plus de 12 mois</option>
          </select>
        </div>

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '18px',
            background: 'linear-gradient(135deg, #C9A227, #E6C75B)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '17px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ✨ Analyser mon projet
        </button>
      </div>
    </form>
  );
}
