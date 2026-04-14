// apps/web/src/tomes/tome3/portals/p1/components/ProjectTypeSelector.tsx

import React from 'react';
import type { ProjectType } from "../../../../../domain/p1/types";

interface Props {
  selected?: ProjectType;
  onSelect: (type: ProjectType) => void;
}

export default function ProjectTypeSelector({ selected, onSelect }: Props) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '24px',
      maxWidth: '1000px',
      margin: '32px auto',
    }}>
      {/* Villa */}
      <button
        onClick={() => onSelect('villa')}
        className={selected === 'villa' ? 'project-type-card selected' : 'project-type-card'}
        style={{
          position: 'relative',
          padding: '32px',
          background: selected === 'villa' 
            ? 'linear-gradient(135deg, rgba(201,162,39,0.15), rgba(232,216,166,0.15))' 
            : 'rgba(255,255,255,0.95)',
          border: selected === 'villa' ? '2px solid #C9A227' : '1px solid rgba(201,162,39,0.25)',
          borderRadius: '20px',
          cursor: 'pointer',
          transition: 'all 0.3s',
          textAlign: 'left',
          transform: selected === 'villa' ? 'translateY(-4px)' : 'none',
          boxShadow: selected === 'villa' 
            ? '0 8px 24px rgba(201,162,39,0.3)' 
            : '0 4px 12px rgba(11,27,58,0.08)',
        }}
      >
        {selected === 'villa' && (
          <div style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '32px',
            height: '32px',
            background: 'linear-gradient(135deg, #C9A227, #E6C75B)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}>
            ✓
          </div>
        )}
        
        <div style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#C9A227',
          marginBottom: '12px',
          letterSpacing: '0.5px',
        }}>
          RÉSIDENTIEL
        </div>
        
        <h3 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#0B1B3A',
          margin: '0 0 16px',
        }}>
          Projet Villa
        </h3>
        
        <p style={{
          fontSize: '15px',
          color: 'rgba(11,27,58,0.75)',
          lineHeight: 1.6,
          margin: 0,
        }}>
          Architecture + design intérieur (bande / jumelée / isolée).
          <br /><br />
          <strong>Inclus :</strong> Plans sur-mesure, dossier autorisation, suivi chantier.
        </p>
      </button>

      {/* Immeuble */}
      <button
        onClick={() => onSelect('immeuble')}
        className={selected === 'immeuble' ? 'project-type-card selected' : 'project-type-card'}
        style={{
          position: 'relative',
          padding: '32px',
          background: selected === 'immeuble' 
            ? 'linear-gradient(135deg, rgba(201,162,39,0.15), rgba(232,216,166,0.15))' 
            : 'rgba(255,255,255,0.95)',
          border: selected === 'immeuble' ? '2px solid #C9A227' : '1px solid rgba(201,162,39,0.25)',
          borderRadius: '20px',
          cursor: 'pointer',
          transition: 'all 0.3s',
          textAlign: 'left',
          transform: selected === 'immeuble' ? 'translateY(-4px)' : 'none',
          boxShadow: selected === 'immeuble' 
            ? '0 8px 24px rgba(201,162,39,0.3)' 
            : '0 4px 12px rgba(11,27,58,0.08)',
        }}
      >
        {selected === 'immeuble' && (
          <div style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '32px',
            height: '32px',
            background: 'linear-gradient(135deg, #C9A227, #E6C75B)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}>
            ✓
          </div>
        )}
        
        <div style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#C9A227',
          marginBottom: '12px',
          letterSpacing: '0.5px',
        }}>
          COLLECTIF
        </div>
        
        <h3 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#0B1B3A',
          margin: '0 0 16px',
        }}>
          Projet Immeuble (R+)
        </h3>
        
        <p style={{
          fontSize: '15px',
          color: 'rgba(11,27,58,0.75)',
          lineHeight: 1.6,
          margin: 0,
        }}>
          Constructibilité maximale & rentabilité (R+1 à R+4).
          <br /><br />
          <strong>Inclus :</strong> Potentiel réglementaire, rendement, RDC commercial.
        </p>
      </button>

      {/* Rénovation */}
      <button
        onClick={() => onSelect('renovation')}
        className={selected === 'renovation' ? 'project-type-card selected' : 'project-type-card'}
        style={{
          position: 'relative',
          padding: '32px',
          background: selected === 'renovation' 
            ? 'linear-gradient(135deg, rgba(201,162,39,0.15), rgba(232,216,166,0.15))' 
            : 'rgba(255,255,255,0.95)',
          border: selected === 'renovation' ? '2px solid #C9A227' : '1px solid rgba(201,162,39,0.25)',
          borderRadius: '20px',
          cursor: 'pointer',
          transition: 'all 0.3s',
          textAlign: 'left',
          transform: selected === 'renovation' ? 'translateY(-4px)' : 'none',
          boxShadow: selected === 'renovation' 
            ? '0 8px 24px rgba(201,162,39,0.3)' 
            : '0 4px 12px rgba(11,27,58,0.08)',
        }}
      >
        {selected === 'renovation' && (
          <div style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '32px',
            height: '32px',
            background: 'linear-gradient(135deg, #C9A227, #E6C75B)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}>
            ✓
          </div>
        )}
        
        <div style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#C9A227',
          marginBottom: '12px',
          letterSpacing: '0.5px',
        }}>
          TRANSFORMATION
        </div>
        
        <h3 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#0B1B3A',
          margin: '0 0 16px',
        }}>
          Rénovation & Décoration
        </h3>
        
        <p style={{
          fontSize: '15px',
          color: 'rgba(11,27,58,0.75)',
          lineHeight: 1.6,
          margin: 0,
        }}>
          Valoriser l'existant (maison / appartement) sans surprise.
          <br /><br />
          <strong>Inclus :</strong> Conformité, design 3D, coûts cachés identifiés.
        </p>
      </button>
    </div>
  );
}
