// apps/web/src/tomes/tome3/portals/p1/components/ProjectRecap.tsx

import React from 'react';

interface Props {
  projectData: any;
  recommendedPack?: {
    id: string;
    name: string;
    price: number;
  };
}

export default function ProjectRecap({ projectData, recommendedPack }: Props) {
  return (
    <div style={{
      background: 'white',
      border: '2px solid #C9A227',
      borderRadius: '20px',
      padding: '32px',
      boxShadow: '0 8px 24px rgba(201,162,39,0.2)',
      marginTop: '32px',
    }}>
      <h2 style={{
        fontSize: '28px',
        fontWeight: 700,
        color: '#0B1B3A',
        margin: '0 0 24px',
      }}>
        📊 Récapitulatif de votre projet
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '20px',
        marginBottom: '32px',
      }}>
        <div>
          <strong style={{ color: 'rgba(11,27,58,0.82)', fontSize: '13px' }}>👤 CONTACT</strong>
          <div style={{ fontSize: '15px', color: '#0B1B3A', marginTop: '6px' }}>
            {projectData.firstname} {projectData.lastname}<br />
            {projectData.email}<br />
            {projectData.phone}
          </div>
        </div>

        <div>
          <strong style={{ color: 'rgba(11,27,58,0.82)', fontSize: '13px' }}>📍 LOCALISATION</strong>
          <div style={{ fontSize: '15px', color: '#0B1B3A', marginTop: '6px' }}>
            {projectData.region}<br />
            {projectData.province}, {projectData.commune}
          </div>
        </div>

        <div>
          <strong style={{ color: 'rgba(11,27,58,0.82)', fontSize: '13px' }}>🏗️ TYPE PROJET</strong>
          <div style={{ fontSize: '15px', color: '#0B1B3A', marginTop: '6px' }}>
            {projectData.type}
            {projectData.villaType && ` (${projectData.villaType})`}
            {projectData.niveau && ` (${projectData.niveau})`}
          </div>
        </div>

        {projectData.area && (
          <div>
            <strong style={{ color: 'rgba(11,27,58,0.82)', fontSize: '13px' }}>📏 SURFACE</strong>
            <div style={{ fontSize: '15px', color: '#0B1B3A', marginTop: '6px' }}>
              {projectData.area} m²
            </div>
          </div>
        )}

        {projectData.budget && (
          <div>
            <strong style={{ color: 'rgba(11,27,58,0.82)', fontSize: '13px' }}>💰 BUDGET</strong>
            <div style={{ fontSize: '15px', color: '#0B1B3A', marginTop: '6px' }}>
              {projectData.budget} MAD
            </div>
          </div>
        )}

        {projectData.timeline && (
          <div>
            <strong style={{ color: 'rgba(11,27,58,0.82)', fontSize: '13px' }}>⏱️ DÉLAI</strong>
            <div style={{ fontSize: '15px', color: '#0B1B3A', marginTop: '6px' }}>
              {projectData.timeline}
            </div>
          </div>
        )}
      </div>

      {recommendedPack && (
        <>
          <div style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(201,162,39,0.3), transparent)',
            margin: '32px 0',
          }} />

          <div style={{
            background: 'linear-gradient(135deg, rgba(201,162,39,0.08), rgba(232,216,166,0.08))',
            borderRadius: '16px',
            padding: '24px',
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#0B1B3A',
              margin: '0 0 12px',
            }}>
              ⭐ Pack recommandé pour votre projet
            </h3>
            
            <div style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#C9A227',
              marginBottom: '8px',
            }}>
              {recommendedPack.name}
            </div>
            
            <div style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#0B1B3A',
            }}>
              {recommendedPack.price.toLocaleString()} MAD <span style={{ fontSize: '16px', fontWeight: 600 }}>HT</span>
            </div>
            
            <div style={{
              fontSize: '14px',
              color: 'rgba(11,27,58,0.68)',
              marginTop: '12px',
            }}>
              Prix calculé automatiquement selon vos critères
            </div>
          </div>
        </>
      )}
    </div>
  );
}
